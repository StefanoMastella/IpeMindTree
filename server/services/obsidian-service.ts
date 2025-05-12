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
  async importFromFiles(files: { name: string, content: string }[], username: string): Promise<boolean> {
    try {
      // Processa os arquivos enviados
      const markdownFiles = obsidianImporter.processUploadedFiles(files);
      
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
      
      nodeLinks.forEach(link => {
        // Evita duplicação de links bidirecionais
        const linkKey1 = `${link.source_id}-${link.target_id}`;
        const linkKey2 = `${link.target_id}-${link.source_id}`;
        
        console.log(`Processando link: ${link.source_id} -> ${link.target_id} (tipo: ${link.type || 'desconhecido'})`);
        
        if (!processedLinks.has(linkKey1) && !processedLinks.has(linkKey2)) {
          links.push({
            source: link.source_id,
            target: link.target_id,
            value: link.strength || 1,
            type: link.type || 'default'
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
   * Enriquece o contexto do RAG com dados do Obsidian
   * Retorna um texto formatado com os dados mais relevantes do Obsidian
   */
  async getObsidianContext(): Promise<string> {
    const nodes = await storage.getAllObsidianNodes();
    
    if (nodes.length === 0) {
      return "Nenhum dado do Obsidian disponível.";
    }
    
    // Limita o número de nós para evitar contexto muito grande
    const MAX_NODES = 20;
    const topNodes = nodes.slice(0, MAX_NODES);
    
    let context = `=== CONTEXTO DO OBSIDIAN (${nodes.length} arquivos) ===\n\n`;
    
    topNodes.forEach((node, index) => {
      context += `DOCUMENTO ${index + 1}: ${node.title}\n`;
      context += `Tags: ${node.tags ? node.tags.join(', ') : 'nenhuma'}\n`;
      
      // Limita o conteúdo para evitar contexto muito grande
      const MAX_CONTENT_LENGTH = 500;
      let content = node.content;
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '...';
      }
      
      context += `Conteúdo: ${content}\n\n`;
    });
    
    if (nodes.length > MAX_NODES) {
      context += `... e mais ${nodes.length - MAX_NODES} documentos não mostrados aqui.\n`;
    }
    
    return context;
  }
}

// Cria uma instância única do serviço
export const obsidianService = new ObsidianService();