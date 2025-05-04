import { storage } from '../storage';
import { googleDriveService } from './google-drive';
import { ObsidianNode, ObsidianLink, ImportLog } from '@shared/schema';

/**
 * Serviço para gerenciar dados do Obsidian
 * Responsável por orquestrar a importação e fornecer métodos para consulta
 */
export class ObsidianService {
  /**
   * Inicia o processo de importação do Obsidian a partir do Google Drive
   * @param folderId ID da pasta do Google Drive
   * @param username Nome do usuário que está realizando a importação
   */
  async importFromGoogleDrive(folderId: string, username: string): Promise<boolean> {
    return await googleDriveService.importObsidianFromDrive(folderId, username);
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
    
    // Formata os nós para visualização
    const nodes = obsidianNodes.map(node => ({
      id: node.id,
      title: node.title,
      tags: node.tags,
      group: node.tags && node.tags.length > 0 ? node.tags[0] : 'uncategorized'
    }));
    
    // Coleta todos os links
    const links: any[] = [];
    const processedLinks = new Set<string>();
    
    for (const node of obsidianNodes) {
      const nodeLinks = await storage.getObsidianLinks(node.id);
      
      nodeLinks.forEach(link => {
        // Evita duplicação de links bidirecionais
        const linkKey1 = `${link.sourceId}-${link.targetId}`;
        const linkKey2 = `${link.targetId}-${link.sourceId}`;
        
        if (!processedLinks.has(linkKey1) && !processedLinks.has(linkKey2)) {
          links.push({
            source: link.sourceId,
            target: link.targetId,
            value: 1
          });
          
          processedLinks.add(linkKey1);
        }
      });
    }
    
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
      if (node.tags) {
        keywords.forEach(keyword => {
          node.tags.forEach(tag => {
            if (tag.toLowerCase().includes(keyword.toLowerCase())) {
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