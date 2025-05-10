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
        
        // Extrai conteúdo com base no tipo
        if (canvasNode.type === 'text') {
          nodeContent = canvasNode.text || '';
          // Tenta extrair um título do texto (primeira linha ou primeiros caracteres)
          nodeTitle = this.extractTitleFromText(nodeContent) || `Node ${canvasNode.id.substring(0, 6)}`;
        } else if (canvasNode.type === 'file') {
          nodeContent = `Reference to file: ${canvasNode.file}`;
          nodeTitle = canvasNode.file?.split('/').pop() || `File Node ${canvasNode.id.substring(0, 6)}`;
        } else if (canvasNode.type === 'link') {
          nodeContent = `URL: ${canvasNode.url}`;
          nodeTitle = canvasNode.text || canvasNode.url || `Link Node ${canvasNode.id.substring(0, 6)}`;
        } else {
          nodeContent = `Canvas node of type: ${canvasNode.type}`;
          nodeTitle = `${canvasNode.type} Node ${canvasNode.id.substring(0, 6)}`;
        }
        
        // Cria o nó Obsidian
        return {
          title: nodeTitle,
          content: nodeContent,
          path: `${filePath}#${canvasNode.id}`,
          tags: ['canvas', `canvas-${nodeType}`],
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
            nodeLabel: canvasNode.text || ''
          }
        };
      });
      
      // Adiciona um nó para o próprio canvas
      nodes.unshift({
        title: fileName,
        content: `Canvas file with ${canvasData.nodes.length} nodes and ${canvasData.edges.length} connections.`,
        path: filePath,
        tags: ['canvas', 'canvas-file'],
        sourceType: 'canvas',
        isImported: true,
        metadata: {
          isCanvasRoot: true,
          nodesCount: canvasData.nodes.length,
          edgesCount: canvasData.edges.length
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
}

// Cria uma instância única do serviço
export const canvasParser = new CanvasParser();