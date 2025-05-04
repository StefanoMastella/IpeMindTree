import * as fs from 'fs';
import * as path from 'path';
import { InsertObsidianNode, InsertObsidianLink, InsertImportLog } from '@shared/schema';
import { storage } from '../storage';

interface MarkdownFile {
  name: string;
  content: string;
  path: string;
  lastModified: Date;
}

interface ObsidianLink {
  sourceId: string;
  targetId: string;
  type: string;
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
      } else if (entry.name.endsWith('.md')) {
        // Processa arquivos markdown
        const content = fs.readFileSync(fullPath, 'utf8');
        const stats = fs.statSync(fullPath);
        const relativePath = fullPath.replace(basePath, '');
        
        files.push({
          name: entry.name,
          content,
          path: relativePath,
          lastModified: stats.mtime
        });
      }
    }
  }
  
  /**
   * Processa uma lista de arquivos markdown enviados pelo usuário
   * @param files Lista de arquivos com conteúdo e metadados
   */
  processUploadedFiles(files: {name: string, content: string}[]): MarkdownFile[] {
    return files.map(file => ({
      name: file.name,
      content: file.content,
      path: `/${file.name}`,
      lastModified: new Date()
    }));
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
   * Salva dados do Obsidian no banco de dados
   * @param nodes Nós a serem salvos
   * @param links Links a serem salvos
   * @param importSource Fonte da importação (ex: "upload", "directory")
   * @param importedBy Nome do usuário que está realizando a importação
   */
  async saveToDatabase(
    nodes: InsertObsidianNode[], 
    links: ObsidianLink[], 
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
        importSource,
        nodesCount: createdNodes.length,
        linksCount: createdLinks.length,
        success: true,
        metadata: { },
        importedBy
      });
      
      return true;
    } catch (error: any) {
      console.error('Erro durante a importação do Obsidian:', error);
      
      // Registra o log de erro
      await storage.createImportLog({
        importSource,
        nodesCount: 0,
        linksCount: 0,
        success: false,
        error: error.message || 'Erro desconhecido durante importação',
        metadata: { stack: error.stack },
        importedBy
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