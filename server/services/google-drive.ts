import { google } from 'googleapis';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { InsertObsidianNode, InsertObsidianLink, InsertImportLog } from '@shared/schema';
import { storage } from '../storage';

interface MarkdownFile {
  id: string;
  name: string; 
  content: string;
  path: string;
  mimeType: string;
  lastModified: Date;
}

interface ObsidianLink {
  sourceId: string;
  targetId: string;
  type: string;
}

/**
 * Serviço para integração com o Google Drive
 * Responsável por buscar e processar arquivos markdown do Obsidian
 */
export class GoogleDriveService {
  private drive;
  private readonly SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
  private auth;
  
  constructor() {
    // Configuração de autenticação do Google Drive
    // Usa a chave de API armazenada como variável de ambiente
    this.auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: this.SCOPES,
    });
    
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }
  
  /**
   * Busca todos os arquivos markdown de uma pasta específica do Google Drive
   * @param folderId ID da pasta no Google Drive onde estão os arquivos do Obsidian
   */
  async listObsidianFiles(folderId: string): Promise<MarkdownFile[]> {
    try {
      const files = [];
      let pageToken: string | undefined = undefined;
      
      // Busca recursiva para pegar todos os arquivos (paginação)
      do {
        // Consulta ao Google Drive API
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and (mimeType='text/markdown' or mimeType='application/vnd.google-apps.folder')`,
          fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
          spaces: 'drive',
          pageToken: pageToken || undefined
        });
        
        const { files: fileList, nextPageToken } = response.data;
        
        // Processa os arquivos encontrados
        for (const file of fileList || []) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Busca recursiva em subpastas
            const subfolderFiles = await this.listObsidianFiles(file.id as string);
            files.push(...subfolderFiles);
          } else if (file.mimeType === 'text/markdown') {
            // Busca o conteúdo do arquivo markdown
            const content = await this.getFileContent(file.id as string);
            files.push({
              id: file.id as string,
              name: file.name as string,
              content: content,
              path: `/${file.name}`,
              mimeType: file.mimeType as string,
              lastModified: new Date(file.modifiedTime as string)
            });
          }
        }
        
        pageToken = nextPageToken || undefined;
      } while (pageToken);
      
      return files;
    } catch (error) {
      console.error('Erro ao buscar arquivos do Obsidian:', error);
      throw error;
    }
  }
  
  /**
   * Obtém o conteúdo de um arquivo específico do Google Drive
   * @param fileId ID do arquivo no Google Drive
   */
  private async getFileContent(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'stream' });
      
      return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const stream = response.data as unknown as Readable;
        
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
    } catch (error) {
      console.error(`Erro ao obter conteúdo do arquivo ${fileId}:`, error);
      return '';
    }
  }
  
  /**
   * Analisa os arquivos markdown para extrair nós e links
   * @param files Lista de arquivos markdown
   */
  parseObsidianData(files: MarkdownFile[]): { nodes: InsertObsidianNode[], links: ObsidianLink[] } {
    const nodes: InsertObsidianNode[] = [];
    const linksMap = new Map<string, ObsidianLink[]>();
    const fileMap = new Map<string, MarkdownFile>();
    
    // Primeiro passo: criar nós para cada arquivo
    files.forEach(file => {
      // Extrai tags do conteúdo
      const tags = this.extractTags(file.content);
      
      // Cria o nó Obsidian
      const node: InsertObsidianNode = {
        title: this.getTitle(file),
        content: file.content,
        path: file.path,
        tags: tags,
        sourceType: 'obsidian',
        isImported: true,
        metadata: { 
          fileId: file.id,
          lastModified: file.lastModified.toISOString()
        }
      };
      
      nodes.push(node);
      fileMap.set(file.path, file);
    });
    
    // Segundo passo: extrair links entre os arquivos
    files.forEach(file => {
      const links = this.extractLinks(file.content);
      
      links.forEach(targetPath => {
        // Normaliza o caminho do link
        let normalizedPath = targetPath;
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = '/' + normalizedPath;
        }
        
        // Verifica se o arquivo alvo existe
        if (fileMap.has(normalizedPath)) {
          const link: ObsidianLink = {
            sourceId: file.path,
            targetId: normalizedPath,
            type: 'wiki-link'
          };
          
          // Adiciona o link ao mapa
          const sourceLinks = linksMap.get(file.path) || [];
          sourceLinks.push(link);
          linksMap.set(file.path, sourceLinks);
        }
      });
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
   * Importa os arquivos Obsidian do Google Drive
   * @param folderId ID da pasta do Google Drive
   * @param importedBy Nome do usuário que está realizando a importação
   */
  async importObsidianFromDrive(folderId: string, importedBy: string): Promise<boolean> {
    try {
      console.log(`Iniciando importação de arquivos Obsidian da pasta ${folderId}`);
      
      // Busca os arquivos markdown
      const files = await this.listObsidianFiles(folderId);
      
      if (files.length === 0) {
        console.log('Nenhum arquivo markdown encontrado');
        await storage.createImportLog({
          importSource: `google-drive:${folderId}`,
          nodesCount: 0,
          linksCount: 0,
          success: false,
          error: 'Nenhum arquivo markdown encontrado',
          metadata: { folderId },
          importedBy
        });
        return false;
      }
      
      console.log(`Encontrados ${files.length} arquivos markdown`);
      
      // Processa os arquivos para extrair nós e links
      const { nodes, links } = this.parseObsidianData(files);
      
      console.log(`Extraídos ${nodes.length} nós e ${links.length} links`);
      
      // Importa os nós para o banco de dados
      const createdNodes = await storage.bulkCreateObsidianNodes(nodes);
      console.log(`${createdNodes.length} nós importados com sucesso`);
      
      // Cria um mapa de path para ID para converter os links
      const pathToIdMap = new Map<string, number>();
      createdNodes.forEach(node => {
        pathToIdMap.set(node.path, node.id);
      });
      
      // Converte os links (path para ID) e importa para o banco de dados
      const dbLinks: InsertObsidianLink[] = links
        .filter(link => 
          pathToIdMap.has(link.sourceId) && 
          pathToIdMap.has(link.targetId))
        .map(link => ({
          sourceId: pathToIdMap.get(link.sourceId)!,
          targetId: pathToIdMap.get(link.targetId)!,
          type: link.type,
          metadata: {}
        }));
      
      const createdLinks = await storage.bulkCreateObsidianLinks(dbLinks);
      console.log(`${createdLinks.length} links importados com sucesso`);
      
      // Registra o log de importação
      await storage.createImportLog({
        importSource: `google-drive:${folderId}`,
        nodesCount: createdNodes.length,
        linksCount: createdLinks.length,
        success: true,
        metadata: { folderId },
        importedBy
      });
      
      return true;
    } catch (error: any) {
      console.error('Erro durante a importação do Obsidian:', error);
      
      // Registra o log de erro
      await storage.createImportLog({
        importSource: `google-drive:${folderId}`,
        nodesCount: 0,
        linksCount: 0,
        success: false,
        error: error.message || 'Erro desconhecido durante importação',
        metadata: { folderId, stack: error.stack },
        importedBy
      });
      
      return false;
    }
  }
}

// Cria uma instância única do serviço
export const googleDriveService = new GoogleDriveService();