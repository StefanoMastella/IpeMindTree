import { ObsidianNode, ObsidianLink } from '@shared/schema';

/**
 * Interface para representar arquivos Canvas do Obsidian
 */
export interface CanvasFile {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * Interface para nós do Canvas
 */
export interface CanvasNode {
  id: string;
  type: string; // 'text', 'file', 'link', etc.
  text?: string;
  file?: string;
  url?: string;
  position: {
    x: number;
    y: number;
  };
  width: number;
  height: number;
  color?: string;
}

/**
 * Interface para arestas (links) do Canvas
 */
export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: string;
  toNode: string;
  toSide?: string;
  label?: string;
  color?: string;
}

/**
 * Classe responsável por analisar arquivos Canvas do Obsidian
 */
export class CanvasParser {
  /**
   * Analisa o conteúdo de um arquivo .canvas do Obsidian
   * @param content Conteúdo JSON do arquivo .canvas
   * @param filePath Caminho do arquivo para referência
   */
  parseCanvasFile(content: string, filePath: string): { nodes: any[], links: CanvasEdge[] } {
    try {
      // Tenta fazer o parse do JSON
      const canvasData = JSON.parse(content) as CanvasFile;
      
      // Valida a estrutura do arquivo
      if (!canvasData.nodes || !Array.isArray(canvasData.nodes)) {
        throw new Error('Formato de Canvas inválido: nodes não encontrado ou não é um array');
      }
      
      if (!canvasData.edges || !Array.isArray(canvasData.edges)) {
        console.warn('Canvas sem edges/links');
        canvasData.edges = [];
      }
      
      // Extrai o nome do arquivo da path (sem extensão)
      const fileName = filePath.split('/').pop()?.replace('.canvas', '') || 'Untitled Canvas';
      
      // Converte nós do Canvas para nós do Obsidian
      const nodes: any[] = canvasData.nodes.map(canvasNode => {
        // Determina o tipo de nó
        let nodeType = canvasNode.type;
        let nodeContent = '';
        let nodeTitle = '';
        // Array para categorias inferidas
        const inferredCategories: string[] = [];
        
        // Extrai conteúdo com base no tipo
        if (canvasNode.type === 'text') {
          nodeContent = canvasNode.text || '';
          // Tenta extrair um título do texto (primeira linha ou primeiros caracteres)
          nodeTitle = this.extractTitleFromText(nodeContent) || `Node ${canvasNode.id.substring(0, 6)}`;
          
          // Inferir categorias com base no texto
          inferredCategories.push(...this.inferCategoriesFromText(nodeContent));
        } else if (canvasNode.type === 'file') {
          nodeContent = `Reference to file: ${canvasNode.file}`;
          nodeTitle = canvasNode.file?.split('/').pop() || `File Node ${canvasNode.id.substring(0, 6)}`;
          
          // Inferir categorias com base no nome do arquivo
          if (canvasNode.file) {
            // Se é um arquivo markdown, podemos inferir nota
            if (canvasNode.file.endsWith('.md')) {
              inferredCategories.push('note');
            }
            // Se parece ser um arquivo de mídia
            else if (/\.(jpe?g|png|gif|svg|mp[34]|wav)$/i.test(canvasNode.file)) {
              inferredCategories.push('resource');
            }
          }
        } else if (canvasNode.type === 'link') {
          nodeContent = `URL: ${canvasNode.url}`;
          nodeTitle = canvasNode.text || canvasNode.url || `Link Node ${canvasNode.id.substring(0, 6)}`;
          inferredCategories.push('reference');
        } else if (canvasNode.type === 'group') {
          nodeContent = canvasNode.text || `Group containing multiple items`;
          nodeTitle = canvasNode.text || `Group ${canvasNode.id.substring(0, 6)}`;
          inferredCategories.push('project');
        } else {
          nodeContent = `Canvas node of type: ${canvasNode.type}`;
          nodeTitle = `${canvasNode.type} Node ${canvasNode.id.substring(0, 6)}`;
        }
        
        // Define tags e categorias para o nó
        const tags = ['canvas', `canvas-${nodeType}`];
        
        // Adiciona categoria inferida se houver
        if (inferredCategories.length > 0) {
          tags.push(...inferredCategories);
        } else {
          // Se não conseguimos inferir categoria, usamos o tipo de nó como fallback
          if (nodeType === 'text') tags.push('note');
          else if (nodeType === 'file') tags.push('resource');
          else if (nodeType === 'link') tags.push('reference');
          else if (nodeType === 'group') tags.push('project');
          else tags.push('concept');
        }
        
        // Remove duplicatas de tags
        const uniqueTags = [...new Set(tags)];
        
        // Extrai possíveis domínios IMT do conteúdo
        const domains = this.inferDomainsFromContent(nodeContent, nodeTitle);
        
        // Cria o nó Obsidian
        return {
          title: nodeTitle,
          content: nodeContent,
          path: `${filePath}#${canvasNode.id}`,
          tags: uniqueTags,
          sourceType: 'canvas',
          isImported: true,
          metadata: {
            canvasId: canvasNode.id,
            canvasType: canvasNode.type,
            position: canvasNode.position,
            dimensions: {
              width: canvasNode.width,
              height: canvasNode.height
            },
            color: canvasNode.color,
            parentCanvas: filePath,
            nodeLabel: canvasNode.text || '',
            inferred_category: inferredCategories[0] || (nodeType === 'text' ? 'note' : nodeType === 'group' ? 'project' : 'concept'),
            domains: domains
          }
        };
      });
      
      // Adiciona um nó para o próprio canvas
      nodes.unshift({
        title: fileName,
        content: `Canvas file with ${canvasData.nodes.length} nodes and ${canvasData.edges.length} connections.`,
        path: filePath,
        tags: ['canvas', 'canvas-file', 'project'],
        sourceType: 'canvas',
        isImported: true,
        metadata: {
          isCanvasRoot: true,
          nodesCount: canvasData.nodes.length,
          edgesCount: canvasData.edges.length,
          inferred_category: 'project',
          domains: this.inferDomainsFromContent(fileName, fileName)
        }
      });
      
      return { nodes, links: canvasData.edges };
    } catch (error) {
      console.error('Erro ao analisar arquivo Canvas:', error);
      throw new Error(`Falha ao analisar arquivo Canvas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Parse do arquivo Canvas2Document gerado a partir do Canvas
   * @param content Conteúdo do arquivo markdown gerado pelo Canvas2Document
   * @param filePath Caminho do arquivo para referência
   */
  parseCanvas2DocumentFile(content: string, filePath: string): { nodes: any[], links: { sourceId: string, targetId: string, type: string }[] } {
    try {
      // Nós extraídos do arquivo convertido
      const nodes: any[] = [];
      
      // Links entre nós
      const links: { sourceId: string, targetId: string, type: string }[] = [];
      
      // Regex para encontrar nós no formato Canvas2Document
      // Exemplo: # _card Título do Nó
      // node ^id_do_no
      const nodeRegex = /# _(?:card|Media) ([^\n]+)\n(?:[^\n]+\n)?node \^([a-z0-9]+)/gm;
      
      // Regex para encontrar links entre nós
      // Exemplo: > linking to: [[#^id_do_destino|Texto do Link]]
      const linkRegex = /> linking to: \[\[#\^([a-z0-9]+)\|?([^\]]*)]]/gm;
      // Regex para encontrar links recebidos (linked from)
      const linkedFromRegex = /> linked from: \[\[#\^([a-z0-9]+)\|?([^\]]*)]]/gm;
      
      // Extrai nome do arquivo para o nó raiz
      const fileName = filePath.split('/').pop()?.replace('_fromCanvas.md', '') || 'Untitled Canvas';
      
      // Cria nó para o Canvas principal
      nodes.push({
        title: fileName,
        content: content,
        path: filePath,
        tags: ['canvas', 'canvas2document'],
        sourceType: 'canvas2document',
        isImported: true,
        metadata: {
          isCanvasRoot: true
        }
      });
      
      // Extrai nós do formato Canvas2Document
      let nodeMatch;
      const idToPaths = new Map<string, string>();
      
      while ((nodeMatch = nodeRegex.exec(content)) !== null) {
        const nodeTitle = nodeMatch[1].trim();
        const nodeId = nodeMatch[2];
        
        // Define o caminho para o nó
        const nodePath = `${filePath}#^${nodeId}`;
        idToPaths.set(nodeId, nodePath);
        
        // Extrai conteúdo do nó (texto entre o cabeçalho e o próximo nó)
        // Encontra a posição de início do conteúdo
        const contentStartPos = nodeMatch.index + nodeMatch[0].length;
        
        // Encontra a posição do próximo nó ou usa o final do arquivo
        const nextNodeMatch = nodeRegex.exec(content);
        nodeRegex.lastIndex = nodeMatch.index + 1; // Reset para não pular nós
        
        const contentEndPos = nextNodeMatch ? nextNodeMatch.index : content.length;
        let nodeContent = content.substring(contentStartPos, contentEndPos).trim();
        
        // Cria o nó Obsidian
        nodes.push({
          title: nodeTitle,
          content: nodeContent,
          path: nodePath,
          tags: ['canvas2document', 'canvas-node'],
          sourceType: 'canvas2document',
          isImported: true,
          metadata: {
            canvasId: nodeId,
            parentCanvas: filePath
          }
        });
      }
      
      // Reset regex lastIndex
      nodeRegex.lastIndex = 0;
      
      // Processa os links encontrados
      while ((nodeMatch = nodeRegex.exec(content)) !== null) {
        const currentNodeId = nodeMatch[2];
        const currentNodePath = idToPaths.get(currentNodeId) || '';
        
        // Encontra links deste nó para outros nós
        const endPosition = content.indexOf('# _', nodeMatch.index + 1) !== -1 
            ? content.indexOf('# _', nodeMatch.index + 1) 
            : content.length;
        
        nodeRegex.lastIndex = nodeMatch.index + 1; // Procura a partir da posição atual
        const nodeContent = content.substring(nodeMatch.index, endPosition);
        
        let linkMatch;
        
        // Links para outros nós
        while ((linkMatch = linkRegex.exec(nodeContent)) !== null) {
          const targetNodeId = linkMatch[1];
          const targetNodePath = idToPaths.get(targetNodeId) || '';
          
          if (targetNodePath) {
            links.push({
              sourceId: currentNodePath,
              targetId: targetNodePath,
              type: 'canvas-link'
            });
          }
        }
        
        // Links de outros nós (para bidirecionalidade)
        while ((linkMatch = linkedFromRegex.exec(nodeContent)) !== null) {
          const sourceNodeId = linkMatch[1];
          const sourceNodePath = idToPaths.get(sourceNodeId) || '';
          
          if (sourceNodePath && currentNodePath) {
            // Adiciona apenas se ainda não estiver mapeado em sentido contrário
            const alreadyExists = links.some(l => 
              l.sourceId === sourceNodePath && l.targetId === currentNodePath);
              
            if (!alreadyExists) {
              links.push({
                sourceId: sourceNodePath,
                targetId: currentNodePath,
                type: 'canvas-link'
              });
            }
          }
        }
      }
      
      return { nodes, links };
    } catch (error) {
      console.error('Erro ao analisar arquivo Canvas2Document:', error);
      throw new Error(`Falha ao analisar arquivo Canvas2Document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extrai um título do texto do nó
   * @param text Texto completo do nó
   */
  private extractTitleFromText(text: string): string {
    // Tenta obter a primeira linha como título
    const firstLine = text.split('\n')[0].trim();
    
    // Se a primeira linha for um título markdown (# Título), remove os # iniciais
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    // Se a primeira linha for curta, usa-a como título
    if (firstLine.length > 0 && firstLine.length <= 50) {
      return firstLine;
    }
    
    // Caso contrário, cria um título a partir dos primeiros caracteres
    return text.substring(0, 40).trim() + (text.length > 40 ? '...' : '');
  }
  
  /**
   * Infere categorias com base no texto do nó
   * @param text Texto do nó
   * @returns Array de categorias inferidas
   */
  private inferCategoriesFromText(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Procura por padrões específicos que sugerem diferentes categorias
    
    // Projetos geralmente contêm certas palavras-chave de ação
    if (
      /\b(projeto|project|criar|create|desenvolver|develop|implementar|implement|construir|build|plano|plan)\b/i.test(lowerText) ||
      text.includes('**Project**') || 
      text.includes('# Project')
    ) {
      categories.push('project');
    }
    
    // Ideias geralmente contêm padrões de brainstorming
    if (
      /\b(ideia|idea|conceito|concept|pensamento|thought|proposta|proposal)\b/i.test(lowerText) ||
      /\b(what if|e se|podemos|could we|imagine)\b/i.test(lowerText) ||
      text.includes('**Idea**') || 
      text.includes('# Idea')
    ) {
      categories.push('idea');
    }
    
    // Notas geralmente são informações ou observações
    if (
      /\b(nota|note|observação|observation|lembrete|reminder|anotação)\b/i.test(lowerText) ||
      text.includes('**Note**') || 
      text.includes('# Note')
    ) {
      categories.push('note');
    }
    
    // Conceitos geralmente são definições ou explicações
    if (
      /\b(conceito|concept|definição|definition|teoria|theory|framework|estrutura)\b/i.test(lowerText) ||
      text.includes('**Concept**') || 
      text.includes('# Concept')
    ) {
      categories.push('concept');
    }
    
    // Pessoas geralmente contêm nomes ou referências a pessoas
    if (
      /\b(pessoa|person|perfil|profile|biografia|biography)\b/i.test(lowerText) ||
      text.includes('**Person**') || 
      text.includes('# Person')
    ) {
      categories.push('person');
    }
    
    // Se for um termo especial do IMT, categorize como Sphere
    if (
      /\b(sphere|esfera|domínio|domain|área|area)\b/i.test(lowerText) ||
      text.includes('Sphere') ||
      text.includes('Esfera')
    ) {
      categories.push('sphere');
    }
    
    // Finanças
    if (
      /\b(finance|finanças|finanças|economia|econômico|investimento|investment)\b/i.test(lowerText) ||
      text.includes('Finance') ||
      text.includes('Finanças')
    ) {
      categories.push('finance');
    }
    
    return categories;
  }
  
  /**
   * Infere possíveis domínios do IMT com base no conteúdo
   * @param content Conteúdo do nó
   * @param title Título do nó
   * @returns Array de domínios inferidos
   */
  private inferDomainsFromContent(content: string, title: string): string[] {
    const domains: string[] = [];
    const combinedText = `${title} ${content}`.toLowerCase();
    
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
}

// Cria uma instância única do serviço
export const canvasParser = new CanvasParser();