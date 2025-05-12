/**
 * Ferramenta para gerar links automáticos entre nós Obsidian
 * Este script analisa os nós existentes e cria links entre eles
 * com base em vários critérios.
 */
import { storage } from '../storage';
import { canvasParser } from '../services/canvas-parser';
import { db } from '../db';
import { obsidian_links, obsidian_nodes } from '@shared/schema';
import { eq, and, like, ilike } from 'drizzle-orm';

async function generateLinks() {
  try {
    console.log("Iniciando geração automática de links entre nós Obsidian");
    
    // Primeiro vamos limpar os links existentes
    console.log("Limpando links existentes...");
    await db.delete(obsidian_links);
    
    // Obter todos os nós
    const nodes = await storage.getAllObsidianNodes();
    console.log(`Encontrados ${nodes.length} nós para processamento`);
    
    const links: any[] = [];
    
    // Mapear nós por caminho para busca rápida
    const nodeByPath = new Map<string, any>();
    nodes.forEach(node => {
      nodeByPath.set(node.path, node);
    });
    
    // Para cada nó, buscar referências no conteúdo
    for (const node of nodes) {
      const content = node.content || "";
      
      // Buscar por links do tipo [[algo]]
      const wikiLinkRegex = /\[\[(.*?)\]\]/g;
      let match;
      
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        const targetPath = match[1].trim();
        let normalizedPath = targetPath;
        
        // Normalizar caminho
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = '/' + normalizedPath;
        }
        
        // Verificar se o alvo existe
        // Primeiro tentar match exato
        let targetNode = nodeByPath.get(normalizedPath);
        
        // Se não encontrar, tentar por título
        if (!targetNode) {
          const possibleTarget = nodes.find(n => n.title === targetPath);
          if (possibleTarget) {
            targetNode = possibleTarget;
          }
        }
        
        // Se ainda não encontrar, tenta por nome de arquivo (sem extensão)
        if (!targetNode) {
          for (const [path, pathNode] of nodeByPath.entries()) {
            const fileName = path.split('/').pop() || "";
            const fileNameNoExt = fileName.replace(/\.[^/.]+$/, "");
            
            if (fileNameNoExt === targetPath) {
              targetNode = pathNode;
              break;
            }
          }
        }
        
        if (targetNode) {
          links.push({
            source_id: node.id,
            target_id: targetNode.id,
            strength: 1,
            type: 'wiki'
          });
          
          console.log(`Link criado: ${node.title} -> ${targetNode.title} (wiki)`);
        }
      }
      
      // Se o nó for do tipo Canvas, extrair links do metadata
      if (node.type === 'canvas' && node.metadata && typeof node.metadata === 'object') {
        const metadata = node.metadata as any;
        
        // Se tiver nós de Canvas armazenados no metadata
        if (metadata.nodes && Array.isArray(metadata.nodes)) {
          // Para cada nó do Canvas, criar link para o nó principal
          for (let i = 0; i < metadata.nodes.length; i++) {
            const canvasNode = metadata.nodes[i];
            
            // Criar link entre o nó raiz e cada nó do Canvas
            links.push({
              source_id: node.id,
              target_id: node.id, // Self-reference for now, just to have something
              strength: 1,
              type: 'canvas'
            });
            
            // Se houver mais de um nó, criar links entre nós adjacentes
            if (i > 0) {
              const prevNode = metadata.nodes[i - 1];
              
              links.push({
                source_id: node.id,
                target_id: node.id, // Self-reference for now
                strength: 0.5,
                type: 'canvas-adjacent'
              });
            }
          }
        }
      }
      
      // Criar links baseados em tags comuns
      // Se o nó tiver tags
      if (node.tags && node.tags.length > 0) {
        // Encontrar outros nós com tags em comum
        for (const otherNode of nodes) {
          // Evitar auto-links
          if (node.id === otherNode.id) continue;
          
          // Se o outro nó tiver tags
          if (otherNode.tags && otherNode.tags.length > 0) {
            // Verificar tags em comum
            const commonTags = node.tags.filter(tag => otherNode.tags.includes(tag));
            
            if (commonTags.length > 0) {
              // Quanto mais tags em comum, mais forte o link
              const strength = 0.2 + (commonTags.length * 0.1);
              
              links.push({
                source_id: node.id,
                target_id: otherNode.id,
                strength: strength > 1 ? 1 : strength,
                type: 'tag',
                metadata: { common_tags: commonTags }
              });
              
              console.log(`Link criado por tags: ${node.title} -> ${otherNode.title} (${commonTags.join(', ')})`);
            }
          }
        }
      }
      
      // Criar links baseados em similaridade de título
      const nodeTitle = node.title.toLowerCase();
      for (const otherNode of nodes) {
        // Evitar auto-links
        if (node.id === otherNode.id) continue;
        
        const otherTitle = otherNode.title.toLowerCase();
        
        // Verificar se o título do outro nó contém o título do nó atual ou vice-versa
        if (otherTitle.includes(nodeTitle) || nodeTitle.includes(otherTitle)) {
          links.push({
            source_id: node.id,
            target_id: otherNode.id,
            strength: 0.3,
            type: 'title-similarity'
          });
          
          console.log(`Link criado por similaridade de título: ${node.title} -> ${otherNode.title}`);
        }
      }
    }
    
    // Inserir todos os links no banco de dados
    if (links.length > 0) {
      console.log(`Inserindo ${links.length} links no banco de dados...`);
      
      // Inserir links em lotes para evitar problemas de performance
      const batchSize = 100;
      for (let i = 0; i < links.length; i += batchSize) {
        const batch = links.slice(i, i + batchSize);
        await db.insert(obsidian_links).values(batch);
      }
      
      console.log(`${links.length} links inseridos com sucesso!`);
    } else {
      console.log("Nenhum link encontrado para inserir.");
    }
    
    console.log("Geração de links concluída com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar links:", error);
  }
}

generateLinks().then(() => {
  console.log("Script de geração de links finalizado.");
  process.exit(0);
}).catch(error => {
  console.error("Erro fatal:", error);
  process.exit(1);
});