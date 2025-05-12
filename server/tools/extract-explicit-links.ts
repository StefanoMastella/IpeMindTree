/**
 * Ferramenta para extrair apenas links explícitos entre nós Obsidian
 * Este script analisa os nós existentes e cria links apenas quando há
 * conexões explícitas (links wiki ou conexões canvas).
 */
import { storage } from '../storage';
import { canvasParser } from '../services/canvas-parser';
import { db } from '../db';
import { obsidian_links, obsidian_nodes } from '@shared/schema';
import { eq, and, like, ilike } from 'drizzle-orm';

async function extractExplicitLinks() {
  try {
    console.log("Iniciando extração de links explícitos entre nós Obsidian");
    
    // Primeiro vamos limpar os links existentes
    console.log("Limpando links existentes...");
    await db.delete(obsidian_links);
    
    // Obter todos os nós
    const nodes = await storage.getAllObsidianNodes();
    console.log(`Encontrados ${nodes.length} nós para processamento`);
    
    const links: any[] = [];
    
    // Mapear nós por caminho e título para busca rápida
    const nodeByPath = new Map<string, any>();
    const nodeByTitle = new Map<string, any>();
    nodes.forEach(node => {
      // Apenas processa nós com caminho definido
      if (node.path) {
        // Guarda o caminho completo
        nodeByPath.set(node.path, node);
        
        // Guarda também só o nome do arquivo (sem extensão)
        const fileName = node.path.split('/').pop() || "";
        const fileNameNoExt = fileName.replace(/\.[^/.]+$/, "");
        if (fileNameNoExt) {
          nodeByPath.set(fileNameNoExt, node);
        }
      }
      
      // Guarda pelo título para busca
      if (node.title) {
        nodeByTitle.set(node.title, node);
      }
    });
    
    // Para cada nó, buscar links Wiki explícitos no conteúdo
    for (const node of nodes) {
      // Skip nós sem conteúdo
      if (!node.content) continue;
      
      const content = node.content;
      
      // Buscar por links do tipo [[algo]] ou [[algo|texto]]
      const wikiLinkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
      let match;
      
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        // O primeiro grupo de captura é o link real, o segundo (se houver) é o texto de exibição
        let targetRef = match[1].trim();
        
        // Se o link contém ".canvas", remove a extensão
        if (targetRef.endsWith('.canvas')) {
          targetRef = targetRef.replace('.canvas', '');
        }
        
        // Verificar se o alvo existe por diferentes métodos
        let targetNode = null;
        
        // 1. Tentar pelo caminho completo
        targetNode = nodeByPath.get(targetRef);
        
        // 2. Tentar com caminho relativo
        if (!targetNode && !targetRef.startsWith('/')) {
          targetNode = nodeByPath.get('/' + targetRef);
        }
        
        // 3. Tentar pelo título
        if (!targetNode) {
          targetNode = nodeByTitle.get(targetRef);
        }
        
        // 4. Tentar só com o nome do arquivo
        if (!targetNode) {
          const targetFileName = targetRef.split('/').pop() || "";
          targetNode = nodeByPath.get(targetFileName);
        }
        
        if (targetNode) {
          links.push({
            source_id: node.id,
            target_id: targetNode.id,
            strength: 1,
            type: 'wiki'
          });
          
          console.log(`Link Wiki extraído: ${node.title} -> ${targetNode.title}`);
        }
      }
      
      // Se o nó for relacionado a Canvas, extrair links do metadata
      // Verifica se há metadata e se os paths sugerem que é um canvas
      if (node.path && 
          (node.path.endsWith('.canvas') || 
           node.metadata && typeof node.metadata === 'object')) {
        try {
          const metadata = node.metadata as any;
          
          // Se tiver dados de Canvas armazenados no metadata
          if (metadata.nodes && Array.isArray(metadata.nodes) && 
              metadata.edges && Array.isArray(metadata.edges)) {
            
            // Mapeamento interno de IDs de nós do Canvas para nós no DB
            const canvasNodeMap = new Map<string, number>();
            
            // Para cada nó do Canvas, cria um link para o nó principal (se necessário)
            metadata.nodes.forEach((canvasNode: any) => {
              if (canvasNode && canvasNode.id) {
                // Armazena o id do nó do canvas para referência
                canvasNodeMap.set(canvasNode.id, node.id);
              }
            });
            
            // Para cada aresta (link) do Canvas, cria um link explícito
            metadata.edges.forEach((canvasEdge: any) => {
              if (canvasEdge && canvasEdge.fromNode && canvasEdge.toNode) {
                const sourceId = canvasNodeMap.get(canvasEdge.fromNode);
                const targetId = canvasNodeMap.get(canvasEdge.toNode);
                
                if (sourceId && targetId) {
                  links.push({
                    source_id: sourceId,
                    target_id: targetId,
                    strength: 1,
                    type: 'canvas-edge'
                  });
                  
                  console.log(`Link Canvas extraído: ${canvasEdge.fromNode} -> ${canvasEdge.toNode}`);
                }
              }
            });
          }
        } catch (error) {
          console.error(`Erro ao extrair links do Canvas ${node.title}:`, error);
        }
      }
    }
    
    // Inserir todos os links explícitos no banco de dados
    if (links.length > 0) {
      console.log(`Inserindo ${links.length} links explícitos no banco de dados...`);
      
      await db.insert(obsidian_links).values(links);
      
      console.log(`${links.length} links inseridos com sucesso!`);
    } else {
      console.log("Nenhum link explícito encontrado para inserir.");
    }
    
    console.log("Extração de links explícitos concluída com sucesso!");
  } catch (error) {
    console.error("Erro ao extrair links explícitos:", error);
  }
}

extractExplicitLinks().then(() => {
  console.log("Script de extração de links explícitos finalizado.");
  process.exit(0);
}).catch(error => {
  console.error("Erro fatal:", error);
  process.exit(1);
});