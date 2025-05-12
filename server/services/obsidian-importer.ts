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
              const node = {
                title: canvasNode.title || `Nó Canvas: ${file.path}`,
                content: canvasNode.content || '',
                path: `${file.path}#${canvasNode.id || Math.random().toString(36).substring(2, 9)}`,
                tags: canvasNode.tags || [],
                is_imported: true,
                metadata: { 
                  lastModified: file.lastModified.toISOString(),
                  canvasData: canvasNode.metadata || {}
                }
              };
              nodes.push(node);
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
              const node = {
                title: canvasNode.title || `Nó Canvas2Doc: ${file.path}`,
                content: canvasNode.content || '',
                path: `${file.path}#${canvasNode.id || Math.random().toString(36).substring(2, 9)}`,
                tags: canvasNode.tags || [],
                is_imported: true,
                metadata: { 
                  lastModified: file.lastModified.toISOString(),
                  canvasData: canvasNode.metadata || {}
                }
              };
              nodes.push(node);
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
          }
        };
        
        nodes.push(node);
      }
      
      fileMap.set(file.path, file);
    });
    
    // Segundo passo: extrair links entre os arquivos
    const pathToIdMap = new Map<string, number>();
    
    // Armazena o ID do nó para cada caminho de arquivo
    files.forEach(file => {
      pathToIdMap.set(file.path, fileNodeMap.get(file.path)?.id || 0);
    });
    
    // Agora processamos os links com os IDs dos nós em vez de caminhos
    files.forEach(file => {
      const sourceNodeId = pathToIdMap.get(file.path) || 0;
      
      // Pula arquivos que não têm ID de nó correspondente
      if (sourceNodeId === 0) {
        return;
      }
      
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
                const nodeId = fileNodeMap.get(nodePath)?.id || 0;
                if (nodeId > 0) {
                  canvasNodeIdMap.set(node.id, nodeId);
                }
              });
            }
            
            // Agora processe os links usando os IDs dos nós
            parsedCanvas.links.forEach(canvasLink => {
              const sourceNodeId = canvasNodeIdMap.get(canvasLink.fromNode) || 0;
              const targetNodeId = canvasNodeIdMap.get(canvasLink.toNode) || 0;
              
              // Pula links onde o nó fonte ou alvo não foi encontrado
              if (sourceNodeId === 0 || targetNodeId === 0) {
                console.log(`Link ignorado: nó não encontrado (${canvasLink.fromNode} -> ${canvasLink.toNode})`);
                return;
              }
              
              // Cria o link usando IDs de nós
              const link: ObsidianLink = {
                source_id: sourceNodeId,
                target_id: targetNodeId,
                strength: 2,
                type: 'canvas'
              };
              
              // Adiciona o link ao mapa usando o ID do nó fonte como chave
              const sourceLinks = linksMap.get(sourceNodeId) || [];
              sourceLinks.push(link);
              linksMap.set(sourceNodeId, sourceLinks);
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
                const sourceNodeId = fileNodeMap.get(nodePath)?.id || 0;
                
                // Pula nós que não têm ID correspondente
                if (sourceNodeId === 0) {
                  return;
                }
                
                textLinks.forEach(targetPath => {
                  // Normaliza o caminho do link
                  let normalizedPath = targetPath;
                  if (!normalizedPath.startsWith('/')) {
                    normalizedPath = '/' + normalizedPath;
                  }
                  
                  // Busca o ID do nó alvo pelo caminho
                  const targetNodeId = pathToIdMap.get(normalizedPath) || 0;
                  
                  // Pula links para nós que não existem
                  if (targetNodeId === 0) {
                    return;
                  }
                  
                  // Cria o link usando IDs de nós
                  const link: ObsidianLink = {
                    source_id: sourceNodeId,
                    target_id: targetNodeId,
                    strength: 1,
                    type: 'text'
                  };
                  
                  // Adiciona o link ao mapa
                  const sourceLinks = linksMap.get(sourceNodeId) || [];
                  sourceLinks.push(link);
                  linksMap.set(sourceNodeId, sourceLinks);
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
                const nodeId = fileNodeMap.get(node.id)?.id || 0;
                if (nodeId > 0) {
                  canvasNodeIdMap.set(node.id, nodeId);
                }
              });
            }
            
            // Processar links usando IDs
            parsedCanvas.links.forEach(canvasLink => {
              const sourceNodeId = canvasNodeIdMap.get(canvasLink.sourceId) || 0;
              const targetNodeId = canvasNodeIdMap.get(canvasLink.targetId) || 0;
              
              // Pula links onde o nó fonte ou alvo não foi encontrado
              if (sourceNodeId === 0 || targetNodeId === 0) {
                return;
              }
              
              // Cria o link usando IDs de nós
              const link: ObsidianLink = {
                source_id: sourceNodeId,
                target_id: targetNodeId,
                strength: 2,
                type: 'canvas2document'
              };
              
              // Adiciona o link ao mapa
              const sourceLinks = linksMap.get(sourceNodeId) || [];
              sourceLinks.push(link);
              linksMap.set(sourceNodeId, sourceLinks);
            });
          }
        } catch (error) {
          console.error(`Erro ao processar links canvas2document ${file.path}:`, error);
        }
      } else {
        // Para arquivos Markdown e texto, extraímos links wiki
        const links = this.extractLinks(file.content);
        
        if (links.length > 0) {
          console.log(`Processando ${links.length} links wiki do arquivo ${file.path}`);
        }
        
        links.forEach(targetPath => {
          // Normaliza o caminho do link
          let normalizedPath = targetPath;
          if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
          }
          
          // Busca o ID do nó alvo pelo caminho
          const targetNodeId = pathToIdMap.get(normalizedPath) || 0;
          
          // Pula links para nós que não existem
          if (targetNodeId === 0) {
            return;
          }
          
          // Cria o link usando IDs de nós
          const link: ObsidianLink = {
            source_id: sourceNodeId,
            target_id: targetNodeId,
            strength: 1,
            type: 'wiki'
          };
          
          // Adiciona o link ao mapa
          const sourceLinks = linksMap.get(sourceNodeId) || [];
          sourceLinks.push(link);
          linksMap.set(sourceNodeId, sourceLinks);
        });
      }
    });
    
    // Converte o mapa de links para array
    const links: ObsidianLink[] = [];
    linksMap.forEach(fileLinks => {
      links.push(...fileLinks);
    });
    
    return { nodes, links };
  }
  
  /**
   * Extrai o título do arquivo markdown
   * @param file Arquivo markdown
   */
  private getTitle(file: MarkdownFile): string {
    // Tenta extrair o título do conteúdo (primeira linha h1)
    const h1Match = file.content.match(/^# (.+)$/m);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }
    
    // Se não encontrar, usa o nome do arquivo sem extensão
    return file.name.replace(/\.md$/, '');
  }
  
  /**
   * Extrai tags do conteúdo markdown
   * @param content Conteúdo do arquivo markdown
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();
    
    // Regex para encontrar tags no formato #tag
    const tagMatches = content.match(/#([a-zA-Z0-9_\-]+)/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        // Remove o # e adiciona a tag
        tags.add(tag.substring(1));
      });
    }
    
    // Regex para encontrar tags no formato YAML Front Matter
    const yamlMatch = content.match(/^---\s*$(.*?)^---\s*$/ms);
    if (yamlMatch && yamlMatch[1]) {
      const yamlContent = yamlMatch[1];
      const tagsMatch = yamlContent.match(/tags:\s*\[(.*?)\]/);
      
      if (tagsMatch && tagsMatch[1]) {
        const yamlTags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        yamlTags.forEach(tag => {
          if (tag) tags.add(tag);
        });
      }
    }
    
    return Array.from(tags);
  }
  
  /**
   * Extrai links wiki do conteúdo markdown
   * @param content Conteúdo do arquivo markdown
   */
  private extractLinks(content: string): string[] {
    const links = new Set<string>();
    
    // Regex para encontrar links no formato [[link]]
    const wikiLinkMatches = content.match(/\[\[([^\]]+)\]\]/g);
    if (wikiLinkMatches) {
      wikiLinkMatches.forEach(match => {
        // Extrai o nome do link
        const linkName = match.substring(2, match.length - 2);
        // Remove qualquer parte após o | (formato [[link|texto]])
        const cleanLink = linkName.split('|')[0].trim();
        
        // Adiciona extensão .md se não existir
        let normalizedLink = cleanLink;
        if (!normalizedLink.endsWith('.md')) {
          normalizedLink += '.md';
        }
        
        links.add(normalizedLink);
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
    links: any[], 
    importSource: string,
    importedBy: string
  ): Promise<boolean> {
    try {
      console.log(`Iniciando importação de ${nodes.length} nós e ${links.length} links do Obsidian`);
      
      // Importa os nós para o banco de dados
      const createdNodes = await storage.bulkCreateObsidianNodes(nodes);
      console.log(`${createdNodes.length} nós importados com sucesso`);
      
      // Cria um mapa de path para ID para converter os links
      const pathToIdMap = new Map<string, number>();
      createdNodes.forEach(node => {
        pathToIdMap.set(node.path, node.id);
      });
      
      // Converte os links (path para ID) e importa para o banco de dados
      const dbLinks: any[] = links
        .filter(link => 
          pathToIdMap.has(link.source_id) && 
          pathToIdMap.has(link.target_id))
        .map(link => ({
          source_id: pathToIdMap.get(link.source_id)!,
          target_id: pathToIdMap.get(link.target_id)!,
          strength: 1
        }));
      
      const createdLinks = await storage.bulkCreateObsidianLinks(dbLinks);
      console.log(`${createdLinks.length} links importados com sucesso`);
      
      // Registra o log de importação
      await storage.createImportLog({
        source: importSource,
        details: {
          nodesCount: createdNodes.length,
          linksCount: createdLinks.length
        },
        success: true,
        type: 'obsidian',
        user_id: importedBy
      });
      
      return true;
    } catch (error: any) {
      console.error('Erro durante a importação do Obsidian:', error);
      
      // Registra o log de erro
      await storage.createImportLog({
        source: importSource,
        details: {
          nodesCount: 0,
          linksCount: 0,
          error: error.message || 'Erro desconhecido durante importação',
          stack: error.stack
        },
        success: false,
        type: 'obsidian',
        user_id: importedBy
      });
      
      return false;
    }
  }
  
  /**
   * Processa um arquivo zip contendo arquivos markdown do Obsidian
   * @param zipPath Caminho do arquivo zip
   * @param username Nome do usuário que está realizando a importação
   */
  async processZipFile(zipFilePath: string, username: string): Promise<boolean> {
    // Este método seria implementado para extrair arquivos de um ZIP e processá-los.
    // Por simplicidade, isso ficará como uma funcionalidade futura.
    return false;
  }
  
  /**
   * Importa arquivos do Obsidian a partir de uma URL de download
   * @param downloadUrl URL para download dos arquivos
   * @param username Nome do usuário que está realizando a importação
   */
  async importFromDownloadUrl(downloadUrl: string, username: string): Promise<boolean> {
    try {
      console.log(`Iniciando importação a partir da URL: ${downloadUrl}`);
      
      // Esta é uma implementação simplificada que apenas simula a importação
      // No futuro, implementaremos o download e extração reais dos arquivos
      console.log(`URL de download fornecida: ${downloadUrl}`);
      console.log(`Usuário que iniciou a importação: ${username}`);
      
      // Registra o log de importação (apenas para testes)
      await storage.createImportLog({
        importSource: 'url_download',
        nodesCount: 0,
        linksCount: 0,
        success: false,
        error: 'Funcionalidade ainda não implementada completamente',
        metadata: { url: downloadUrl },
        importedBy: username
      });
      
      return true; // Retorna true para indicar que o processo foi iniciado com sucesso
    } catch (error: any) {
      console.error('Erro durante a importação via URL:', error);
      
      // Registra o log de erro
      await storage.createImportLog({
        importSource: 'url_download',
        nodesCount: 0,
        linksCount: 0,
        success: false,
        error: error.message || 'Erro desconhecido durante importação',
        metadata: { url: downloadUrl, stack: error.stack },
        importedBy: username
      });
      
      return false;
    }
  }
}

// Cria uma instância única do serviço
export const obsidianImporter = new ObsidianImporter();