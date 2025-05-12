import * as fs from 'fs';
import * as path from 'path';
import { insertObsidianNodeSchema, insertObsidianLinkSchema, insertImportLogSchema } from '@shared/schema';
import { storage } from '../storage';
import { canvasParser } from './canvas-parser';

// Define o tipo MarkdownFile para representar arquivos Markdown
type MarkdownFile = {
  name: string;
  content: string;
  path: string;
  lastModified: Date;
  type: 'markdown' | 'canvas' | 'canvas2document' | 'text';
};

interface ObsidianFile {
  name: string;
  content: string;
  path: string;
  lastModified: Date;
  type: 'markdown' | 'canvas' | 'canvas2document' | 'text'; // Tipo de arquivo
}

interface ObsidianLink {
  source_id: number;
  target_id: number;
  strength?: number;
  type?: string;
  metadata?: any;
}

/**
 * Serviço simplificado para importação de arquivos do Obsidian
 * Responsável por processar arquivos markdown locais ou enviados pelo usuário
 */
export class ObsidianImporter {
  
  /**
   * Processa um diretório local contendo arquivos markdown
   * @param directoryPath Caminho para o diretório de arquivos
   */
  async processLocalDirectory(directoryPath: string): Promise<MarkdownFile[]> {
    try {
      const files: MarkdownFile[] = [];
      await this.readDirectory(directoryPath, files);
      return files;
    } catch (error) {
      console.error('Erro ao processar diretório:', error);
      throw error;
    }
  }
  
  /**
   * Lê um diretório recursivamente para encontrar arquivos markdown
   * @param dirPath Caminho do diretório
   * @param files Array para armazenar os arquivos encontrados
   * @param basePath Base path para calcular caminhos relativos
   */
  private async readDirectory(
    dirPath: string, 
    files: MarkdownFile[], 
    basePath: string = dirPath
  ): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Processa subdiretórios recursivamente
        await this.readDirectory(fullPath, files, basePath);
      } else {
        // Detecção do tipo de arquivo 
        const ext = path.extname(entry.name).toLowerCase();
        let fileType: 'markdown' | 'canvas' | 'canvas2document' | 'text' = 'text';
        
        if (ext === '.md') {
          fileType = 'markdown';
        } else if (ext === '.canvas') {
          fileType = 'canvas';
        } else if (ext === '.txt') {
          fileType = 'text';
        } else {
          // Pula outros tipos de arquivo
          continue;
        }
        
        // Lê o conteúdo do arquivo
        const content = fs.readFileSync(fullPath, 'utf8');
        const stats = fs.statSync(fullPath);
        const relativePath = fullPath.replace(basePath, '');
        
        // Se for markdown, verifica se é um Canvas2Document
        if (fileType === 'markdown' && content.includes('# Canvas') && content.includes('# _')) {
          fileType = 'canvas2document';
        }
        
        files.push({
          name: entry.name,
          content,
          path: relativePath,
          lastModified: stats.mtime,
          type: fileType
        });
      }
    }
  }
  
  /**
   * Processa uma lista de arquivos markdown enviados pelo usuário
   * @param files Lista de arquivos com conteúdo e metadados
   */
  processUploadedFiles(files: {name: string, content: string}[]): MarkdownFile[] {
    return files.map(file => {
      // Determina o tipo de arquivo com base na extensão
      const extension = path.extname(file.name).toLowerCase();
      let fileType: 'markdown' | 'canvas' | 'canvas2document' | 'text' = 'text';
      
      if (extension === '.md') {
        // Verifica se é um arquivo Canvas2Document 
        if (file.content.includes('# Canvas') && file.content.includes('# _')) {
          fileType = 'canvas2document';
        } else {
          fileType = 'markdown';
        }
      } else if (extension === '.canvas') {
        fileType = 'canvas';
      }
      
      return {
        name: file.name,
        content: file.content,
        path: `/${file.name}`,
        lastModified: new Date(),
        type: fileType
      };
    });
  }
  
  /**
   * Analisa os arquivos do Obsidian para extrair nós e links
   * @param files Lista de arquivos (markdown, canvas, etc)
   */
  parseObsidianData(files: MarkdownFile[]): { nodes: any[], links: ObsidianLink[] } {
    const nodes: any[] = [];
    const linksMap = new Map<string, ObsidianLink[]>();
    const fileMap = new Map<string, MarkdownFile>();
    
    // Mapa para armazenar os nós criados por caminho
    const fileNodeMap = new Map<string, any>();
    
    // Variável para gerar IDs incrementais para os nós
    let nextNodeId = 1;
    
    // Primeiro passo: criar nós para cada arquivo
    files.forEach(file => {
      // Processa diferentemente com base no tipo de arquivo
      if (file.type === 'canvas') {
        try {
          // Analisa arquivo .canvas usando o parser especializado
          const parsedCanvas = canvasParser.parseCanvasFile(file.content, file.path);
          
          // Adiciona todos os nós encontrados
          if (parsedCanvas.nodes && parsedCanvas.nodes.length > 0) {
            parsedCanvas.nodes.forEach(canvasNode => {
              const nodePath = `${file.path}#${canvasNode.id || Math.random().toString(36).substring(2, 9)}`;
              const node = {
                title: canvasNode.title || `Nó Canvas: ${file.path}`,
                content: canvasNode.content || '',
                path: nodePath,
                tags: canvasNode.tags || [],
                is_imported: true,
                metadata: { 
                  lastModified: file.lastModified.toISOString(),
                  canvasData: canvasNode.metadata || {}
                },
                id: nextNodeId++
              };
              nodes.push(node);
              
              // Armazena o nó no mapa para uso posterior na criação de links
              fileNodeMap.set(nodePath, node);
            });
          }
        } catch (error) {
          console.error(`Erro ao processar arquivo canvas ${file.path}:`, error);
        }
      } else if (file.type === 'canvas2document') {
        try {
          // Analisa arquivo markdown gerado pelo Canvas2Document
          const parsedCanvas = canvasParser.parseCanvas2DocumentFile(file.content, file.path);
          
          // Adiciona todos os nós encontrados
          if (parsedCanvas.nodes && parsedCanvas.nodes.length > 0) {
            parsedCanvas.nodes.forEach(canvasNode => {
              const nodePath = `${file.path}#${canvasNode.id || Math.random().toString(36).substring(2, 9)}`;
              const node = {
                title: canvasNode.title || `Nó Canvas2Doc: ${file.path}`,
                content: canvasNode.content || '',
                path: nodePath,
                tags: canvasNode.tags || [],
                is_imported: true,
                metadata: { 
                  lastModified: file.lastModified.toISOString(),
                  canvasData: canvasNode.metadata || {}
                },
                id: nextNodeId++
              };
              nodes.push(node);
              
              // Armazena o nó no mapa para uso posterior na criação de links
              fileNodeMap.set(nodePath, node);
            });
          }
        } catch (error) {
          console.error(`Erro ao processar arquivo canvas2document ${file.path}:`, error);
        }
      } else {
        // Processa arquivo markdown ou texto normalmente
        // Extrai tags do conteúdo
        const tags = this.extractTags(file.content);
        
        // Cria o nó Obsidian
        const node = {
          title: this.getTitle(file),
          content: file.content,
          path: file.path,
          tags: tags,
          is_imported: true,
          metadata: { 
            lastModified: file.lastModified.toISOString()
          },
          id: nextNodeId++
        };
        
        nodes.push(node);
        
        // Armazena o nó no mapa para uso posterior na criação de links
        fileNodeMap.set(file.path, node);
      }
      
      fileMap.set(file.path, file);
    });
    
    // Segundo passo: extrair links entre os arquivos
    const pathToIdMap = new Map<string, number>();
    
    // Armazena o ID do nó para cada caminho de arquivo
    files.forEach(file => {
      const node = fileNodeMap.get(file.path);
      if (node) {
        pathToIdMap.set(file.path, node.id);
      }
    });
    
    // Converter o mapa de links para um array
    const links: ObsidianLink[] = [];
    
    // Agora processamos os links com os IDs dos nós em vez de caminhos
    files.forEach(file => {
      const sourceNode = fileNodeMap.get(file.path);
      
      if (!sourceNode) {
        return;
      }
      
      const sourceNodeId = sourceNode.id;
      
      // Processa diferentemente com base no tipo de arquivo
      if (file.type === 'canvas') {
        try {
          // Para arquivos Canvas, usamos os links já definidos no arquivo
          const parsedCanvas = canvasParser.parseCanvasFile(file.content, file.path);
          
          // Processa as arestas do Canvas (links visuais)
          if (parsedCanvas.links && parsedCanvas.links.length > 0) {
            console.log(`Processando ${parsedCanvas.links.length} links do Canvas ${file.path}`);
            
            // Construa um mapa de IDs de nós dentro do canvas
            const canvasNodeIdMap = new Map<string, number>();
            
            // Para cada nó do Canvas, encontre seu ID no DB
            if (parsedCanvas.nodes && parsedCanvas.nodes.length > 0) {
              parsedCanvas.nodes.forEach(node => {
                const nodePath = node.path || `${file.path}#${node.id}`;
                const mappedNode = fileNodeMap.get(nodePath);
                
                if (mappedNode) {
                  canvasNodeIdMap.set(node.id, mappedNode.id);
                }
              });
            }
            
            // Agora processe os links usando os IDs dos nós
            parsedCanvas.links.forEach(canvasLink => {
              const sourceId = canvasNodeIdMap.get(canvasLink.fromNode);
              const targetId = canvasNodeIdMap.get(canvasLink.toNode);
              
              // Pula links onde o nó fonte ou alvo não foi encontrado
              if (!sourceId || !targetId) {
                console.log(`Link ignorado: nó não encontrado (${canvasLink.fromNode} -> ${canvasLink.toNode})`);
                return;
              }
              
              // Cria o link usando IDs de nós
              const link: ObsidianLink = {
                source_id: sourceId,
                target_id: targetId,
                strength: 2,
                type: 'canvas'
              };
              
              links.push(link);
            });
          } else {
            console.log(`Canvas ${file.path} não tem links visuais, buscando links em texto`);
            
            // Se não houver links visuais, tenta extrair links dos textos dos nós
            const canvasNodes = parsedCanvas.nodes || [];
            
            canvasNodes.forEach(canvasNode => {
              if (canvasNode.content) {
                // Extrai links wiki do conteúdo do nó
                const textLinks = this.extractLinks(canvasNode.content);
                const nodePath = canvasNode.path || `${file.path}#${canvasNode.id}`;
                const sourceNode = fileNodeMap.get(nodePath);
                
                if (!sourceNode) {
                  return;
                }
                
                const sourceNodeId = sourceNode.id;
                
                textLinks.forEach(targetPath => {
                  // Normaliza o caminho do link
                  let normalizedPath = targetPath;
                  if (!normalizedPath.startsWith('/')) {
                    normalizedPath = '/' + normalizedPath;
                  }
                  
                  // Busca o ID do nó alvo pelo caminho
                  const targetNodeId = pathToIdMap.get(normalizedPath);
                  
                  // Pula links para nós que não existem
                  if (!targetNodeId) {
                    return;
                  }
                  
                  // Cria o link usando IDs de nós
                  const link: ObsidianLink = {
                    source_id: sourceNodeId,
                    target_id: targetNodeId,
                    strength: 1,
                    type: 'text'
                  };
                  
                  links.push(link);
                });
              }
            });
          }
        } catch (error) {
          console.error(`Erro ao processar links canvas ${file.path}:`, error);
        }
      } else if (file.type === 'canvas2document') {
        try {
          // Para arquivos Canvas2Document, extraímos links do markdown
          const parsedCanvas = canvasParser.parseCanvas2DocumentFile(file.content, file.path);
          if (parsedCanvas.links && parsedCanvas.links.length > 0) {
            console.log(`Processando ${parsedCanvas.links.length} links do Canvas2Document ${file.path}`);
            
            // Construa um mapa de IDs de nós dentro do canvas2document
            const canvasNodeIdMap = new Map<string, number>();
            
            // Para cada nó do Canvas2Document, encontre seu ID no DB
            if (parsedCanvas.nodes && parsedCanvas.nodes.length > 0) {
              parsedCanvas.nodes.forEach(node => {
                const nodePath = `${file.path}#${node.id}`;
                const mappedNode = fileNodeMap.get(nodePath);
                if (mappedNode) {
                  canvasNodeIdMap.set(node.id, mappedNode.id);
                }
              });
            }
            
            // Processar links usando IDs
            parsedCanvas.links.forEach(canvasLink => {
              const sourceId = canvasNodeIdMap.get(canvasLink.sourceId);
              const targetId = canvasNodeIdMap.get(canvasLink.targetId);
              
              // Pula links onde o nó fonte ou alvo não foi encontrado
              if (!sourceId || !targetId) {
                return;
              }
              
              // Cria o link usando IDs de nós
              const link: ObsidianLink = {
                source_id: sourceId,
                target_id: targetId,
                strength: 2,
                type: 'canvas2document'
              };
              
              links.push(link);
            });
          }
        } catch (error) {
          console.error(`Erro ao processar links canvas2document ${file.path}:`, error);
        }
      } else {
        // Para arquivos Markdown e texto, extraímos links wiki
        const wikiLinks = this.extractLinks(file.content);
        
        if (wikiLinks.length > 0) {
          console.log(`Processando ${wikiLinks.length} links wiki do arquivo ${file.path}`);
        }
        
        wikiLinks.forEach(targetPath => {
          // Normaliza o caminho do link
          let normalizedPath = targetPath;
          if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
          }
          
          // Busca o ID do nó alvo pelo caminho
          const targetNodeId = pathToIdMap.get(normalizedPath);
          
          // Pula links para nós que não existem
          if (!targetNodeId) {
            return;
          }
          
          // Cria o link usando IDs de nós
          const link: ObsidianLink = {
            source_id: sourceNodeId,
            target_id: targetNodeId,
            strength: 1,
            type: 'wiki'
          };
          
          links.push(link);
        });
      }
    });
    
    return { nodes, links };
  }
  
  /**
   * Extrai o título do arquivo markdown
   * @param file Arquivo markdown
   */
  private getTitle(file: MarkdownFile): string {
    // Tenta extrair o título do H1 no topo do arquivo
    const h1Match = file.content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1];
    }
    
    // Se não encontrar um H1, use o nome do arquivo sem a extensão
    return path.basename(file.name, path.extname(file.name));
  }
  
  /**
   * Extrai tags do conteúdo markdown
   * @param content Conteúdo do arquivo markdown
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();
    
    // Padrão para tags no Obsidian (#tag)
    const tagMatches = content.match(/#([a-zA-Z0-9_\-/]+)/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        // Remove o # do início
        const cleanTag = tag.substring(1);
        tags.add(cleanTag);
      });
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extrai links wiki do conteúdo markdown
   * @param content Conteúdo do arquivo markdown
   */
  private extractLinks(content: string): string[] {
    const links = new Set<string>();
    
    // Padrão para links wiki: [[caminho/para/arquivo]] ou [[caminho/para/arquivo|Texto alternativo]]
    // Usando regex sem a flag "d" para compatibilidade com versões mais antigas do JavaScript
    const wikiMatches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
    
    if (wikiMatches) {
      wikiMatches.forEach(match => {
        // Extrai apenas o caminho do link (sem o texto alternativo)
        const linkMatch = match.match(/\[\[([^\]|]+)/);
        if (linkMatch && linkMatch[1]) {
          links.add(linkMatch[1]);
        }
      });
    }
    
    return Array.from(links);
  }
  
  /**
   * Salva dados do Obsidian no banco de dados
   * @param nodes Nós a serem salvos
   * @param links Links a serem salvos
   * @param importSource Fonte da importação (ex: "upload", "directory")
   * @param importedBy Nome do usuário que está realizando a importação
   */
  async saveToDatabase(
    nodes: any[], 
    links: ObsidianLink[],
    importSource: string = 'upload',
    importedBy: string = 'system'
  ): Promise<boolean> {
    try {
      console.log(`Salvando ${nodes.length} nós e ${links.length} links no banco de dados`);
      
      // Validar nós antes de inserir
      const validNodes = nodes.map(node => {
        // Garante que propriedades requeridas existam
        return {
          ...node,
          title: node.title || 'Sem título',
          content: node.content || '',
          path: node.path || '',
          tags: node.tags || [],
          metadata: node.metadata || {}
        };
      });
      
      // Salva os nós no banco de dados e obtém a lista com os IDs
      const savedNodes = await storage.bulkCreateObsidianNodes(validNodes);
      
      console.log(`Salvos ${savedNodes.length} nós no banco de dados`);
      
      // Cria um mapa de caminhos para IDs dos nós salvos
      const nodePaths = new Map<string, number>();
      savedNodes.forEach(node => {
        if (node.path) {
          nodePaths.set(node.path, node.id);
        }
      });
      
      // Adiciona os links usando os IDs dos nós salvos
      if (links.length > 0) {
        const savedLinks = await storage.bulkCreateObsidianLinks(links);
        console.log(`Salvos ${savedLinks.length} links no banco de dados`);
      }
      
      // Registra o log da importação
      const importLog = {
        source: importSource,
        imported_by: importedBy,
        metadata: {
          nodes_count: savedNodes.length,
          links_count: links.length,
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createImportLog(importLog);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no banco:', error);
      throw error;
    }
  }
  
  /**
   * Processa um arquivo zip contendo arquivos markdown do Obsidian
   * @param zipPath Caminho do arquivo zip
   * @param username Nome do usuário que está realizando a importação
   */
  async processZipFile(zipFilePath: string, username: string): Promise<boolean> {
    // Implementação futura
    return false;
  }
  
  /**
   * Importa arquivos do Obsidian a partir de uma URL de download
   * @param downloadUrl URL para download dos arquivos
   * @param username Nome do usuário que está realizando a importação
   */
  async importFromDownloadUrl(downloadUrl: string, username: string): Promise<boolean> {
    // Implementação futura
    return false;
  }
}

export const obsidianImporter = new ObsidianImporter();