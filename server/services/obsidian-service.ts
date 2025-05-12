import { storage } from '../storage';
import { obsidianImporter } from './obsidian-importer';
import { ObsidianNode, ObsidianLink, ImportLog } from '@shared/schema';

/**
 * Serviço para gerenciar dados do Obsidian
 * Responsável por orquestrar a importação e fornecer métodos para consulta
 */
export class ObsidianService {
  /**
   * Infere possíveis domínios do IMT com base no nó
   * @param node Nó do Obsidian
   * @returns Array de domínios inferidos
   */
  private inferDomainsFromNode(node: ObsidianNode): string[] {
    const domains: string[] = [];
    const combinedText = `${node.title} ${node.content || ''}`.toLowerCase();
    
    // Mapeamento de palavras-chave para domínios do IMT
    const domainKeywords: Record<string, string[]> = {
      'governance': ['govern', 'policy', 'regulation', 'law', 'legal', 'rules', 'compliance'],
      'health': ['health', 'medical', 'medicine', 'wellness', 'therapy', 'healthcare', 'patient'],
      'education': ['education', 'learning', 'teaching', 'school', 'university', 'student', 'knowledge'],
      'finance': ['finance', 'money', 'economic', 'investment', 'currency', 'banking', 'financial'],
      'technology': ['technology', 'tech', 'digital', 'software', 'hardware', 'engineering', 'innovation'],
      'community': ['community', 'social', 'society', 'network', 'people', 'collective', 'collaboration'],
      'resources': ['resource', 'material', 'supply', 'sustainability', 'environment', 'ecological'],
      'projects': ['project', 'initiative', 'plan', 'development', 'implementation', 'execution'],
      'ethics': ['ethics', 'moral', 'values', 'principles', 'responsibility', 'integrity']
    };
    
    // Verifica cada domínio
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      // Se qualquer palavra-chave estiver presente, adiciona o domínio
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        domains.push(domain);
      }
    });
    
    // Verificações especiais para domínios específicos do IMT
    if (combinedText.includes('acoustical') || combinedText.includes('sound')) {
      domains.push('acoustical_governance');
    }
    
    if (combinedText.includes('dracologos') || combinedText.includes('draco')) {
      domains.push('dracologos');
    }
    
    if (combinedText.includes('optimism') || combinedText.includes('techno-optimism')) {
      domains.push('techno_optimism');
    }
    
    return domains;
  }
  /**
   * Importa arquivos do Obsidian a partir de uma URL de download
   * @param downloadUrl URL para download dos arquivos
   * @param username Nome do usuário que está realizando a importação
   */
  async importFromUrl(downloadUrl: string, username: string): Promise<boolean> {
    return await obsidianImporter.importFromDownloadUrl(downloadUrl, username);
  }
  
  /**
   * Importa arquivos do Obsidian a partir de arquivos markdown enviados pelo usuário
   * @param files Lista de arquivos com nome e conteúdo
   * @param username Nome do usuário que está realizando a importação
   */
  async importFromFiles(files: { name: string, content: string }[], username: string, forceNew: boolean = false): Promise<boolean> {
    try {
      // Processa os arquivos enviados
      const markdownFiles = obsidianImporter.processUploadedFiles(files);
      
      // Se forceNew é verdadeiro, adiciona um timestamp aos paths para garantir unicidade
      if (forceNew) {
        const timestamp = Date.now();
        markdownFiles.forEach(file => {
          file.path = `${file.path}_${timestamp}`;
        });
      }
      
      // Analisa os arquivos para extrair nós e links
      const { nodes, links } = obsidianImporter.parseObsidianData(markdownFiles);
      
      // Salva no banco de dados
      return await obsidianImporter.saveToDatabase(nodes, links, 'upload', username);
    } catch (error) {
      console.error('Erro ao importar arquivos:', error);
      return false;
    }
  }
  
  /**
   * Busca todos os nós do Obsidian
   */
  async getAllNodes(): Promise<ObsidianNode[]> {
    return await storage.getAllObsidianNodes();
  }
  
  /**
   * Busca um nó específico do Obsidian por ID
   * @param id ID do nó
   */
  async getNodeById(id: number): Promise<ObsidianNode | undefined> {
    return await storage.getObsidianNode(id);
  }
  
  /**
   * Busca um nó específico do Obsidian por caminho
   * @param path Caminho do arquivo
   */
  async getNodeByPath(path: string): Promise<ObsidianNode | undefined> {
    return await storage.getObsidianNodeByPath(path);
  }
  
  /**
   * Busca todos os links de um nó específico
   * @param nodeId ID do nó
   */
  async getNodeLinks(nodeId: number): Promise<ObsidianLink[]> {
    return await storage.getObsidianLinks(nodeId);
  }
  
  /**
   * Obtém dados de rede para visualização de conexões
   * Retorna nós e links formatados para uso com bibliotecas de visualização
   */
  async getNetworkData(): Promise<{nodes: any[], links: any[]}> {
    const obsidianNodes = await storage.getAllObsidianNodes();
    
    console.log(`Formatando ${obsidianNodes.length} nós para visualização de rede`);
    
    // Formata os nós para visualização
    const nodes = obsidianNodes.map(node => {
      // Determinar o grupo (categoria) para coloração do nó
      let group = 'uncategorized';
      
      // Primeiro tenta usar a categoria inferida armazenada nos metadados
      if (node.metadata && typeof node.metadata === 'object') {
        const metadata = node.metadata as any;
        if (metadata.inferred_category) {
          group = metadata.inferred_category;
        }
      }
      
      // Se não tiver categoria inferida, usa a primeira tag
      if (group === 'uncategorized' && node.tags && node.tags.length > 0) {
        // Verifica se alguma tag corresponde a categorias conhecidas
        const validCategories = [
          'project', 'idea', 'note', 'concept', 'person', 
          'resource', 'finance', 'sphere', 'task', 'article'
        ];
        
        // Procura pela primeira tag que seja uma categoria válida
        const categoryTag = node.tags.find(tag => validCategories.includes(tag));
        if (categoryTag) {
          group = categoryTag;
        } else {
          // Se não encontrou categoria válida, usa a primeira tag
          group = node.tags[0];
        }
      }
      
      // Tenta inferir domínios com base no título e conteúdo
      let domains: string[] = [];
      if (node.metadata && typeof node.metadata === 'object') {
        const metadata = node.metadata as any;
        if (metadata.domains && Array.isArray(metadata.domains)) {
          domains = metadata.domains;
        }
      }
      
      // Se não tiver domínios inferidos, tenta inferir agora
      if (domains.length === 0) {
        domains = this.inferDomainsFromNode(node);
      }
      
      return {
        id: node.id,
        title: node.title,
        tags: node.tags,
        group: group,
        domains: domains
      };
    });
    
    // Coleta todos os links
    const links: any[] = [];
    const processedLinks = new Set<string>();
    let processedCount = 0;
    
    console.log(`Buscando links para ${obsidianNodes.length} nós`);
    
    for (const node of obsidianNodes) {
      const nodeLinks = await storage.getObsidianLinks(node.id);
      processedCount++;
      
      if (processedCount % 10 === 0) {
        console.log(`Processados links de ${processedCount}/${obsidianNodes.length} nós`);
      }
      
      if (nodeLinks.length > 0) {
        console.log(`Nó ${node.id} (${node.title}) tem ${nodeLinks.length} links`);
      }
      
      // Processa apenas links explícitos (wiki, canvas-edge)
      nodeLinks.forEach(link => {
        // Verifica se é um link explícito pelos tipos permitidos
        const isExplicitLink = link.type === 'wiki' || 
                               link.type === 'canvas-edge';
        
        if (!isExplicitLink) {
          return; // Ignora links que não são explícitos
        }
        
        // Evita duplicação de links bidirecionais
        const linkKey1 = `${link.source_id}-${link.target_id}`;
        const linkKey2 = `${link.target_id}-${link.source_id}`;
        
        console.log(`Processando link explícito: ${link.source_id} -> ${link.target_id} (tipo: ${link.type})`);
        
        if (!processedLinks.has(linkKey1) && !processedLinks.has(linkKey2)) {
          links.push({
            source: link.source_id,
            target: link.target_id,
            value: link.strength || 1,
            type: link.type
          });
          
          processedLinks.add(linkKey1);
          console.log(`Link adicionado: ${link.source_id} -> ${link.target_id}`);
        } else {
          console.log(`Link ignorado (duplicado): ${link.source_id} -> ${link.target_id}`);
        }
      });
    }
    
    console.log(`Retornando grafo com ${nodes.length} nós e ${links.length} links`);
    
    return { nodes, links };
  }
  
  /**
   * Obtém logs de importação
   */
  async getImportLogs(): Promise<ImportLog[]> {
    return await storage.getImportLogs();
  }
  
  /**
   * Encontra nós relevantes com base em palavras-chave
   * @param keywords Palavras-chave para busca
   */
  async findRelevantNodes(keywords: string[]): Promise<ObsidianNode[]> {
    const allNodes = await storage.getAllObsidianNodes();
    
    // Algoritmo simples de pontuação
    const scoredNodes = allNodes.map(node => {
      let score = 0;
      
      // Pontuação por palavra-chave no título
      keywords.forEach(keyword => {
        if (node.title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 3;
        }
      });
      
      // Pontuação por palavra-chave no conteúdo
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = node.content.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      
      // Pontuação por tags
      if (node.tags && Array.isArray(node.tags)) {
        keywords.forEach(keyword => {
          node.tags!.forEach(tag => {
            if (typeof tag === 'string' && tag.toLowerCase().includes(keyword.toLowerCase())) {
              score += 2;
            }
          });
        });
      }
      
      return { node, score };
    });
    
    // Filtra e ordena por pontuação
    return scoredNodes
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.node);
  }
  
  /**
   * Busca nós do Obsidian por título e/ou conteúdo
   * Permite encontrar documentos mesmo quando estão aninhados em outros
   * @param searchQuery Texto para buscar em títulos e conteúdo
   * @param limit Limite de resultados (padrão 10)
   */
  async searchObsidianNodes(searchQuery: string, limit: number = 10): Promise<ObsidianNode[]> {
    if (!searchQuery || searchQuery.trim() === '') {
      return [];
    }
    
    const allNodes = await storage.getAllObsidianNodes();
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // Pontuação para cada nó
    const scoredNodes = allNodes.map(node => {
      let score = 0;
      
      // Pontuação por correspondência exata no título (maior peso)
      if (node.title.toLowerCase() === normalizedQuery) {
        score += 100;
      }
      // Pontuação por correspondência parcial no título
      else if (node.title.toLowerCase().includes(normalizedQuery)) {
        score += 50;
      }
      
      // Pontuação por correspondência no conteúdo
      if (node.content && typeof node.content === 'string') {
        // Correspondência exata no conteúdo
        if (node.content.toLowerCase().includes(normalizedQuery)) {
          score += 30;
          
          // Adiciona pontos extras baseado no número de ocorrências
          const matches = node.content.toLowerCase().split(normalizedQuery).length - 1;
          score += matches * 2;
        }
        
        // Correspondência de palavras individuais da consulta
        const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
        for (const word of queryWords) {
          if (node.content.toLowerCase().includes(word)) {
            score += 5;
          }
          if (node.title.toLowerCase().includes(word)) {
            score += 10;
          }
        }
      }
      
      // Pontuação por tags relacionadas
      if (node.tags && Array.isArray(node.tags)) {
        for (const tag of node.tags) {
          if (typeof tag === 'string' && tag.toLowerCase().includes(normalizedQuery)) {
            score += 15;
          }
        }
      }
      
      // Pontuação por path (menos relevante, mas ainda importante)
      if (node.path && typeof node.path === 'string' && node.path.toLowerCase().includes(normalizedQuery)) {
        score += 10;
      }
      
      return { node, score };
    });
    
    // Filtra resultados que têm score > 0 e ordena por pontuação
    return scoredNodes
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.node);
  }
  
  /**
   * Enriquece o contexto do RAG com dados do Obsidian
   * Retorna um texto formatado com os dados mais relevantes do Obsidian
   */
  async getObsidianContext(): Promise<string> {
    const nodes = await storage.getAllObsidianNodes();
    
    if (nodes.length === 0) {
      return "Nenhum dado do Obsidian disponível.";
    }
    
    // Organiza os nós por tipo de conteúdo (baseado em tags)
    const categorizedNodes = new Map<string, ObsidianNode[]>();
    
    // Categorias conhecidas para agrupar nós
    const categories = ['project', 'note', 'concept', 'canvas', 'card', 'file', 'resource'];
    
    // Inicializa as categorias
    categories.forEach(category => categorizedNodes.set(category, []));
    
    // Categoriza cada nó (um nó pode aparecer em múltiplas categorias)
    nodes.forEach(node => {
      let categorized = false;
      
      if (node.tags && node.tags.length > 0) {
        for (const tag of node.tags) {
          if (categories.includes(tag)) {
            categorizedNodes.get(tag)?.push(node);
            categorized = true;
          }
        }
      }
      
      // Se não foi categorizado em nenhuma categoria específica, coloca em 'note'
      if (!categorized) {
        categorizedNodes.get('note')?.push(node);
      }
    });
    
    let context = `=== CONTEXTO DO OBSIDIAN (${nodes.length} arquivos) ===\n\n`;
    
    // Adiciona um resumo das categorias
    context += "## Resumo do conteúdo:\n";
    categories.forEach(category => {
      const categoryNodes = categorizedNodes.get(category) || [];
      if (categoryNodes.length > 0) {
        context += `- ${category.charAt(0).toUpperCase() + category.slice(1)}: ${categoryNodes.length} documentos\n`;
      }
    });
    
    context += "\n## Documentos mais importantes:\n\n";
    
    // Limite de nós por categoria para manter o contexto gerenciável
    const MAX_NODES_PER_CATEGORY = 5;
    const MAX_CONTENT_LENGTH = 600;
    
    // Adiciona os nós mais importantes de cada categoria
    categories.forEach(category => {
      const categoryNodes = categorizedNodes.get(category) || [];
      
      if (categoryNodes.length > 0) {
        context += `### ${category.toUpperCase()}:\n`;
        
        const nodesToShow = categoryNodes.slice(0, MAX_NODES_PER_CATEGORY);
        
        nodesToShow.forEach((node, index) => {
          context += `DOCUMENTO ${category}-${index + 1}: ${node.title}\n`;
          context += `ID: ${node.id}, Path: ${node.path || 'N/A'}\n`;
          context += `Tags: ${node.tags ? node.tags.join(', ') : 'nenhuma'}\n`;
          
          // Limita o conteúdo para evitar contexto muito grande
          let content = node.content || '';
          if (content.length > MAX_CONTENT_LENGTH) {
            content = content.substring(0, MAX_CONTENT_LENGTH) + '...';
          }
          
          // Formata o conteúdo para ser mais claro
          context += `Conteúdo: ${content.replace(/\n/g, ' ').replace(/\s+/g, ' ')}\n\n`;
        });
        
        if (categoryNodes.length > MAX_NODES_PER_CATEGORY) {
          context += `... e mais ${categoryNodes.length - MAX_NODES_PER_CATEGORY} documentos ${category} não mostrados aqui.\n\n`;
        }
      }
    });
    
    // Adiciona uma nota sobre como usar as referências
    context += "\n## Como usar as referências:\n";
    context += "Quando responder ao usuário, você pode referenciar documentos específicos usando seu ID ou título.\n";
    context += "Exemplo: 'De acordo com o documento PROJECT-1 (Título do documento)...'\n";
    context += "IMPORTANTE: Para buscar informações específicas como 'Rafa Castaneda', use todo o conteúdo disponível, incluindo documentos aninhados e seções dentro de documentos maiores.\n";
    
    return context;
  }
}

// Cria uma instância única do serviço
export const obsidianService = new ObsidianService();