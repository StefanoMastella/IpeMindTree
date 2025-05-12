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
  type: string; // 'text', 'file', 'link', 'group', etc.
  text?: string;
  file?: string;
  url?: string;
  subpath?: string; // Referência a uma seção específica de um arquivo
  position: {
    x: number;
    y: number;
  };
  width: number;
  height: number;
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
  collapsed?: boolean; // Para nós de grupo
  children?: string[]; // IDs dos nós filhos para grupos
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
  width?: number;
  style?: string; // 'solid', 'dashed', etc.
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
      console.log(`Analisando arquivo Canvas: ${filePath}`);
      
      // Lida com casos onde o conteúdo pode estar vazio ou mal-formado
      if (!content || content.trim() === '') {
        console.error(`Conteúdo vazio no arquivo Canvas: ${filePath}`);
        return { nodes: [], links: [] };
      }
      
      // Tenta fazer o parse do JSON com tratamento robusto
      let canvasData: CanvasFile;
      try {
        canvasData = JSON.parse(content) as CanvasFile;
      } catch (parseError) {
        console.error(`Erro ao analisar JSON do arquivo Canvas ${filePath}:`, parseError);
        // Tenta remover possíveis caracteres de formatação indesejados
        const cleanedContent = content
          .replace(/^\ufeff/, '') // Remove BOM
          .replace(/\\u[\dA-Fa-f]{4}/g, match => JSON.parse(`"${match}"`)); // Lida com escape de Unicode
        
        try {
          canvasData = JSON.parse(cleanedContent) as CanvasFile;
          console.log(`Parse JSON recuperado com sucesso após limpeza para: ${filePath}`);
        } catch (secondError) {
          console.error(`Falha definitiva ao analisar JSON do arquivo Canvas ${filePath} após tentativa de limpeza:`, secondError);
          throw new Error(`Formato de arquivo Canvas inválido: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
        }
      }
      
      // Valida a estrutura do arquivo
      if (!canvasData.nodes || !Array.isArray(canvasData.nodes)) {
        console.error(`Formato inválido: 'nodes' não encontrado ou não é um array em ${filePath}`);
        canvasData.nodes = [];
      }
      
      if (!canvasData.edges || !Array.isArray(canvasData.edges)) {
        console.log(`Canvas sem edges/links definidos em ${filePath}`);
        canvasData.edges = [];
      }
      
      console.log(`Canvas ${filePath} contém ${canvasData.nodes.length} nós e ${canvasData.edges.length} conexões`)
      
      // Extrai o nome do arquivo da path (sem extensão)
      const fileName = filePath.split('/').pop()?.replace('.canvas', '') || 'Untitled Canvas';
      
      // Converte nós do Canvas para nós do Obsidian
      const nodes: any[] = [];
      const nodePaths = new Map<string, string>(); // Mapeia ID do nó -> caminho do nó
      
      // Primeiro, extrair todos os nós
      for (const canvasNode of canvasData.nodes) {
        // Skip nós sem ID (não deveriam existir, mas por segurança)
        if (!canvasNode.id) {
          console.warn(`Nó sem ID encontrado em ${filePath}, ignorando...`);
          continue;
        }
        
        // Determina o tipo de nó
        const nodeType = canvasNode.type || 'unknown';
        let nodeContent = '';
        let nodeTitle = '';
        let sourcePath = ''; // Caminho de arquivo de origem para nós de tipo 'file'
        
        // Array para categorias inferidas
        const inferredCategories: string[] = [];
        
        // Extrai conteúdo com base no tipo
        if (nodeType === 'text') {
          // Trata nós de texto
          nodeContent = canvasNode.text || '';
          
          // Busca por links wiki no texto
          const wikiLinks: string[] = [];
          const wikiLinkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
          let match;
          
          while ((match = wikiLinkRegex.exec(nodeContent)) !== null) {
            wikiLinks.push(match[1].trim());
          }
          
          // Tenta extrair um título do texto (primeira linha ou primeiros caracteres)
          nodeTitle = this.extractTitleFromText(nodeContent) || `Text Node ${canvasNode.id.substring(0, 6)}`;
          
          // Inferir categorias com base no texto
          inferredCategories.push(...this.inferCategoriesFromText(nodeContent));
          
          // Adiciona informação de links wiki encontrados nos metadados
          if (wikiLinks.length > 0) {
            console.log(`${wikiLinks.length} links wiki encontrados no nó de texto: ${nodeTitle}`);
          }
        } 
        else if (nodeType === 'file') {
          // Trata nós de arquivo
          sourcePath = canvasNode.file || '';
          nodeContent = `Reference to file: ${sourcePath}`;
          
          // Tenta extrair o nome do arquivo e a extensão
          const filePathParts = sourcePath.split('/');
          const fileName = filePathParts[filePathParts.length - 1] || '';
          
          nodeTitle = fileName || `File Node ${canvasNode.id.substring(0, 6)}`;
          
          // Inferir categorias com base no nome do arquivo
          if (fileName) {
            // Se é um arquivo markdown, podemos inferir nota
            if (fileName.endsWith('.md')) {
              inferredCategories.push('note');
            }
            // Se é um arquivo canvas
            else if (fileName.endsWith('.canvas')) {
              inferredCategories.push('project');
            }
            // Se parece ser um arquivo de mídia
            else if (/\.(jpe?g|png|gif|svg|mp[34]|wav)$/i.test(fileName)) {
              inferredCategories.push('resource');
            }
            // Se é um arquivo PDF ou outros documentos
            else if (/\.(pdf|docx?|xlsx?|pptx?|csv|json)$/i.test(fileName)) {
              inferredCategories.push('resource');
            }
          }
        } 
        else if (nodeType === 'link') {
          // Trata nós de link (URL)
          const url = canvasNode.url || '';
          nodeContent = `URL: ${url}`;
          nodeTitle = canvasNode.text || url || `Link Node ${canvasNode.id.substring(0, 6)}`;
          inferredCategories.push('reference');
        } 
        else if (nodeType === 'group') {
          // Trata nós de grupo
          nodeContent = canvasNode.text || `Group containing multiple items`;
          nodeTitle = canvasNode.text || `Group ${canvasNode.id.substring(0, 6)}`;
          inferredCategories.push('project');
          
          // Se o grupo contém filho, registra isso nos metadados
          if (canvasNode.children && canvasNode.children.length > 0) {
            console.log(`Grupo ${nodeTitle} contém ${canvasNode.children.length} nós filhos`);
          }
        } 
        else if (nodeType === 'iframe') {
          // Trata nós iframe/embed
          const url = canvasNode.url || '';
          nodeContent = `Embedded content from: ${url}`;
          nodeTitle = canvasNode.text || url || `Embed ${canvasNode.id.substring(0, 6)}`;
          inferredCategories.push('reference');
        }
        else {
          // Tipo desconhecido
          nodeContent = `Canvas node of type: ${nodeType}`;
          nodeTitle = `${nodeType} Node ${canvasNode.id.substring(0, 6)}`;
          console.warn(`Tipo de nó desconhecido: ${nodeType} em ${filePath}`);
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
          else if (nodeType === 'iframe') tags.push('reference');
          else tags.push('concept');
        }
        
        // Remove duplicatas de tags
        const uniqueTags = Array.from(new Set(tags));
        
        // Extrai possíveis domínios IMT do conteúdo
        const domains = this.inferDomainsFromContent(nodeContent, nodeTitle);
        
        // Caminho único para este nó no banco de dados
        const nodePath = `${filePath}#${canvasNode.id}`;
        nodePaths.set(canvasNode.id, nodePath);
        
        // Cria o nó Obsidian com informações detalhadas
        const obsidianNode = {
          title: nodeTitle,
          content: nodeContent,
          path: nodePath,
          tags: uniqueTags,
          sourceType: 'canvas',
          isImported: true,
          metadata: {
            canvasId: canvasNode.id,
            canvasType: nodeType,
            position: canvasNode.position,
            dimensions: {
              width: canvasNode.width,
              height: canvasNode.height
            },
            color: canvasNode.color,
            backgroundColor: canvasNode.backgroundColor,
            fontSize: canvasNode.fontSize,
            parentCanvas: filePath,
            inferred_category: inferredCategories.length > 0 ? inferredCategories[0] : null,
            domains: domains,
            sourcePath: sourcePath // Para nós de arquivo, guarda o caminho original
          }
        };
        
        nodes.push(obsidianNode);
      }
      
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
      
      // Processa as arestas com informações adicionais
      const processedLinks = canvasData.edges.map(edge => {
        // Encontrar os caminhos dos nós de origem e destino
        const sourceNodePath = nodePaths.get(edge.fromNode);
        const targetNodePath = nodePaths.get(edge.toNode);
        
        if (!sourceNodePath || !targetNodePath) {
          console.warn(`Link com nós não encontrados: ${edge.id} (${edge.fromNode} -> ${edge.toNode})`);
        }
        
        return {
          ...edge,
          // Adicionando metadados úteis para debugging e processamento
          sourceNodePath,
          targetNodePath,
          linkType: edge.label ? 'labeled' : 'unlabeled',
          linkStyle: edge.style || 'default',
          linkStrength: edge.width ? (edge.width / 5) : 1 // Normaliza a força do link baseado na largura
        };
      });
      
      // Log insights sobre os links
      console.log(`Canvas ${filePath}: ${nodes.length} nós extraídos (incluindo o arquivo), ${processedLinks.length} links processados`);
      
      return { nodes, links: processedLinks };
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
  parseCanvas2DocumentFile(content: string, filePath: string): { nodes: any[], links: { sourceId: string, targetId: string, type: string, label?: string }[] } {
    try {
      console.log(`Analisando arquivo Canvas2Document: ${filePath}`);
      
      // Verifica se o conteúdo é válido
      if (!content || content.trim() === '') {
        console.error(`Conteúdo vazio no arquivo Canvas2Document: ${filePath}`);
        return { nodes: [], links: [] };
      }
      
      // Nós extraídos do arquivo convertido
      const nodes: any[] = [];
      
      // Links entre nós
      const links: { sourceId: string, targetId: string, type: string, label?: string }[] = [];
      
      // Mapeamento de IDs para caminhos completos
      const nodePathMap = new Map<string, string>();
      
      // Regex para encontrar nós no formato Canvas2Document
      // Exemplo: # _card Título do Nó
      // node ^id_do_no
      const nodeRegex = /# _(?:card|Media|File|Group|Link|iframe) ([^\n]+)\n(?:[^\n]+\n)?node \^([a-z0-9_-]+)/gm;
      
      // Regex para encontrar links explícitos do Obsidian em texto
      const wikiLinkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
      
      // Regex para encontrar links entre nós
      // Exemplo: > linking to: [[#^id_do_destino|Texto do Link]]
      const linkRegex = /> linking to: \[\[#\^([a-z0-9_-]+)\|?([^\]]*)]]/gm;
      
      // Regex para encontrar links recebidos (linked from)
      const linkedFromRegex = /> linked from: \[\[#\^([a-z0-9_-]+)\|?([^\]]*)]]/gm;
      
      // Extrai nome do arquivo para o nó raiz (removendo sufixos de canvas convertido)
      const fileName = filePath.split('/').pop()?.replace(/(_fromCanvas\.md|\.md)$/, '') || 'Untitled Canvas';
      
      // Cria nó para o Canvas principal
      const rootNode = {
        title: fileName,
        content: `Canvas convertido para Markdown (${fileName})`,
        path: filePath,
        tags: ['canvas', 'canvas2document', 'project'],
        sourceType: 'canvas2document',
        isImported: true,
        metadata: {
          isCanvasRoot: true,
          inferred_category: 'project',
          domains: this.inferDomainsFromContent(fileName, fileName)
        }
      };
      
      nodes.push(rootNode);
      
      // Extrai nós
      let match;
      const nodeMap = new Map<string, number>(); // Mapeia id -> index no array de nós
      
      while ((match = nodeRegex.exec(content)) !== null) {
        const title = match[1].trim();
        const id = match[2];
        
        // Encontra o conteúdo do nó
        const startPos = match.index + match[0].length;
        let endPos = content.indexOf('# _', startPos);
        if (endPos === -1) endPos = content.length;
        
        // Extrai o conteúdo entre o cabeçalho do nó e o próximo nó
        let nodeContent = content.substring(startPos, endPos).trim();
        
        // Remove marcações específicas do Canvas2Document
        nodeContent = nodeContent.replace(/> (?:linking to|linked from): \[\[.+\]\]/g, '')
          .replace(/^node \^[a-z0-9_-]+$/gm, '')
          .trim();
        
        // Infere tipo de nó com base no cabeçalho
        let nodeType = 'note';
        let inferredCategories: string[] = [];
        
        // Tenta detectar tipo de nó a partir do formato em markdown
        const headerMatch = match[0].match(/# _(card|Media|File|Group|Link|iframe)/);
        if (headerMatch) {
          const typeInHeader = headerMatch[1].toLowerCase();
          
          if (typeInHeader === 'card') {
            nodeType = 'text';
            inferredCategories = this.inferCategoriesFromText(nodeContent);
          } 
          else if (typeInHeader === 'media' || typeInHeader === 'file') {
            nodeType = 'file';
            // Verifica extensão no título
            if (title.match(/\.(md|txt|rtf)$/i)) {
              inferredCategories.push('note');
            } 
            else if (title.match(/\.(canvas)$/i)) {
              inferredCategories.push('project');
            }
            else if (title.match(/\.(jpe?g|png|gif|svg|mp[34]|wav|pdf)$/i)) {
              inferredCategories.push('resource');
            }
          } 
          else if (typeInHeader === 'group') {
            nodeType = 'group';
            inferredCategories.push('project');
          } 
          else if (typeInHeader === 'link' || typeInHeader === 'iframe') {
            nodeType = typeInHeader;
            inferredCategories.push('reference');
          }
        }
        
        // Procura por wiki links [[link]] no conteúdo
        const wikiLinks: string[] = [];
        let wikiMatch;
        
        while ((wikiMatch = wikiLinkRegex.exec(nodeContent)) !== null) {
          const linkTarget = wikiMatch[1].trim();
          wikiLinks.push(linkTarget);
        }
        
        // Se não conseguimos inferir categoria, usamos o tipo como fallback
        if (inferredCategories.length === 0) {
          if (nodeType === 'text') inferredCategories.push('note');
          else if (nodeType === 'file') inferredCategories.push('resource');
          else if (nodeType === 'group') inferredCategories.push('project');
          else if (nodeType === 'link' || nodeType === 'iframe') inferredCategories.push('reference');
          else inferredCategories.push('concept');
        }
        
        // Define tags com base no tipo e categorias
        const tags = ['canvas', 'canvas2document', `canvas-${nodeType}`, ...inferredCategories];
        // Remove duplicatas
        const uniqueTags = Array.from(new Set(tags));
        
        // Caminho completo para o nó
        const nodePath = `${filePath}#^${id}`;
        nodePathMap.set(id, nodePath);
        
        // Extrai domínios do IMT
        const domains = this.inferDomainsFromContent(nodeContent, title);
        
        // Cria o nó Obsidian
        const node = {
          title,
          content: nodeContent,
          path: nodePath,
          tags: uniqueTags,
          sourceType: 'canvas2document',
          isImported: true,
          metadata: {
            canvasId: id,
            canvasType: nodeType,
            inferred_category: inferredCategories[0] || 'concept',
            domains,
            foundWikiLinks: wikiLinks.length > 0 ? wikiLinks : undefined
          }
        };
        
        // Adiciona o nó e registra sua posição
        nodeMap.set(id, nodes.length);
        nodes.push(node);
        
        // Adiciona links wiki encontrados no conteúdo
        if (wikiLinks.length > 0) {
          console.log(`${wikiLinks.length} links wiki encontrados no nó: ${title}`);
          // Esses links serão processados posteriormente pelo obsidian-service
        }
      }
      
      // Encontra links entre nós
      // Reset do regex
      linkRegex.lastIndex = 0;
      
      const processedLinks = new Set<string>(); // Evita links duplicados
      
      while ((match = linkRegex.exec(content)) !== null) {
        const targetId = match[1];
        const linkText = match[2] || '';
        
        // Encontra o nó de origem
        let sourceContent = content.substring(0, match.index);
        const sourceNodeMatch = sourceContent.match(/node \^([a-z0-9_-]+)(?!.*node \^)/s);
        
        if (sourceNodeMatch) {
          const sourceId = sourceNodeMatch[1];
          const sourceNodePath = nodePathMap.get(sourceId);
          const targetNodePath = nodePathMap.get(targetId);
          
          if (sourceNodePath && targetNodePath) {
            // Cria um ID único para o link
            const linkId = `${sourceId}->${targetId}`;
            
            // Verifica se este link já foi processado
            if (!processedLinks.has(linkId)) {
              // Adiciona o link
              links.push({
                sourceId: sourceNodePath,
                targetId: targetNodePath,
                type: 'canvas',
                label: linkText
              });
              
              processedLinks.add(linkId);
            }
          } else {
            console.warn(`Link com nós não encontrados: ${sourceId} -> ${targetId}`);
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