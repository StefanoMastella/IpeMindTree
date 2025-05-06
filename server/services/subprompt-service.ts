import { storage } from "../storage";
import { db } from "../db";
import { subprompts, type InsertSubprompt, type Subprompt } from "@shared/schema";
import { eq } from "drizzle-orm";
import computeCosineSimilarity from "compute-cosine-similarity";

interface SubpromptWithEmbedding extends Subprompt {
  embedding: number[];
}

/**
 * Serviço para gerenciar os subprompts do IMT
 * Responsável por armazenar, selecionar e gerenciar subprompts para o LLM
 */
export class SubpromptService {
  // Cache de subprompts para evitar consultas repetidas ao banco de dados
  private subpromptCache: SubpromptWithEmbedding[] | null = null;
  private lastCacheUpdate: Date = new Date(0); // Data de última atualização do cache

  constructor() {
    // Inicialização do serviço
    console.log("Subprompt service initialized");
  }

  /**
   * Atualiza o cache de subprompts se necessário
   * O cache é atualizado no máximo uma vez a cada hora
   */
  private async updateCacheIfNeeded(): Promise<void> {
    const now = new Date();
    const oneHour = 60 * 60 * 1000; // 1 hora em milissegundos

    // Atualiza o cache se ele estiver vazio ou se a última atualização foi há mais de uma hora
    if (!this.subpromptCache || now.getTime() - this.lastCacheUpdate.getTime() > oneHour) {
      try {
        // Busca todos os subprompts ativos
        const allSubprompts = await this.getAllSubprompts();
        this.subpromptCache = allSubprompts.filter(sp => sp.active);
        this.lastCacheUpdate = now;
        console.log(`Subprompt cache updated with ${this.subpromptCache.length} active subprompts`);
      } catch (error) {
        console.error("Error updating subprompt cache:", error);
        // Se houver um erro, mantém o cache como está
        if (!this.subpromptCache) {
          this.subpromptCache = [];
        }
      }
    }
  }

  /**
   * Obtém todos os subprompts armazenados
   */
  async getAllSubprompts(): Promise<SubpromptWithEmbedding[]> {
    try {
      const subpromptsList = await db.select().from(subprompts);
      return subpromptsList.map(sp => ({
        ...sp,
        embedding: sp.embedding ? (sp.embedding as unknown as number[]) : []
      }));
    } catch (error) {
      console.error("Error fetching subprompts:", error);
      return [];
    }
  }

  /**
   * Obtém um subprompt pelo ID
   */
  async getSubpromptById(id: number): Promise<SubpromptWithEmbedding | null> {
    try {
      const [subprompt] = await db.select().from(subprompts).where(eq(subprompts.id, id));
      if (!subprompt) return null;
      
      return {
        ...subprompt,
        embedding: subprompt.embedding ? (subprompt.embedding as unknown as number[]) : []
      };
    } catch (error) {
      console.error(`Error fetching subprompt with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Cria um novo subprompt
   */
  async createSubprompt(data: InsertSubprompt): Promise<Subprompt | null> {
    try {
      // Gera embedding para o subprompt
      const embedding = await this.generateEmbedding(
        data.name + " " + data.description + " " + 
        (Array.isArray(data.keywords) ? data.keywords.join(" ") : "")
      );

      // Insere o subprompt com o embedding
      const [subprompt] = await db.insert(subprompts).values({
        ...data,
        embedding: embedding as any
      }).returning();

      // Limpa o cache para forçar atualização na próxima consulta
      this.subpromptCache = null;

      return subprompt;
    } catch (error) {
      console.error("Error creating subprompt:", error);
      return null;
    }
  }

  /**
   * Atualiza um subprompt existente
   */
  async updateSubprompt(id: number, data: Partial<InsertSubprompt>): Promise<Subprompt | null> {
    try {
      // Se os campos relevantes para embedding foram modificados, gera novo embedding
      if (data.name || data.description || data.keywords) {
        const [currentSubprompt] = await db.select().from(subprompts).where(eq(subprompts.id, id));
        if (!currentSubprompt) return null;

        const newEmbeddingText = 
          (data.name || currentSubprompt.name) + " " + 
          (data.description || currentSubprompt.description) + " " + 
          (Array.isArray(data.keywords) ? data.keywords.join(" ") : 
            (Array.isArray(currentSubprompt.keywords) ? currentSubprompt.keywords.join(" ") : ""));
        
        const embedding = await this.generateEmbedding(newEmbeddingText);
        
        // Atualiza com o novo embedding
        const [updatedSubprompt] = await db.update(subprompts)
          .set({ ...data, embedding: embedding as any, updatedAt: new Date() })
          .where(eq(subprompts.id, id))
          .returning();
        
        // Limpa o cache para forçar atualização na próxima consulta
        this.subpromptCache = null;
        
        return updatedSubprompt;
      } else {
        // Atualiza sem gerar novo embedding
        const [updatedSubprompt] = await db.update(subprompts)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(subprompts.id, id))
          .returning();
        
        // Limpa o cache para forçar atualização na próxima consulta
        this.subpromptCache = null;
        
        return updatedSubprompt;
      }
    } catch (error) {
      console.error(`Error updating subprompt with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Remove um subprompt
   */
  async deleteSubprompt(id: number): Promise<boolean> {
    try {
      await db.delete(subprompts).where(eq(subprompts.id, id));
      
      // Limpa o cache para forçar atualização na próxima consulta
      this.subpromptCache = null;
      
      return true;
    } catch (error) {
      console.error(`Error deleting subprompt with ID ${id}:`, error);
      return false;
    }
  }

  /**
   * Gera um embedding para um texto usando a API do Gemini (ou outra solução de embedding)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Simulação de embedding - em produção, deve-se usar um serviço de embedding real
      // Para simplificar, vamos criar um embedding simples baseado na frequência de palavras
      const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
      const wordFreq: Record<string, number> = {};
      
      // Conta a frequência de cada palavra
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      // Cria um vetor de características de 100 dimensões (simplificado)
      const embeddingSize = 100;
      const embedding = new Array(embeddingSize).fill(0);
      
      // Preenche o vetor com base nas palavras (método simplificado)
      Object.entries(wordFreq).forEach(([word, freq], index) => {
        const position = hashString(word) % embeddingSize;
        embedding[position] += freq;
      });
      
      // Normaliza o embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
    } catch (error) {
      console.error("Error generating embedding:", error);
      // Retorna um embedding vazio em caso de erro
      return new Array(100).fill(0);
    }
  }

  /**
   * Seleciona o subprompt mais relevante para uma query de usuário
   */
  async selectSubprompt(userQuery: string): Promise<string> {
    try {
      // Atualiza o cache se necessário
      await this.updateCacheIfNeeded();
      
      // Se não há subprompts no cache, retorna uma string vazia
      if (!this.subpromptCache || this.subpromptCache.length === 0) {
        console.log("No subprompts available in cache");
        return "";
      }
      
      // Gera um embedding para a query do usuário
      const queryEmbedding = await this.generateEmbedding(userQuery);
      
      // Calcula a similaridade entre a query e cada subprompt
      const similarities = this.subpromptCache.map(subprompt => {
        // Se o subprompt não tem embedding, retorna similaridade zero
        if (!subprompt.embedding || subprompt.embedding.length === 0) {
          return { subprompt, similarity: 0 };
        }
        
        // Calcula a similaridade de cosseno entre os embeddings
        const similarity = computeCosineSimilarity(queryEmbedding, subprompt.embedding);
        return { subprompt, similarity };
      });
      
      // Ordena por similaridade (maior primeiro)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Verifica se a melhor correspondência tem uma similaridade significativa
      if (similarities[0] && similarities[0].similarity > 0.5) {
        console.log(`Selected subprompt: ${similarities[0].subprompt.name} (similarity: ${similarities[0].similarity.toFixed(2)})`);
        return similarities[0].subprompt.content;
      }
      
      // Se não houver uma correspondência significativa, procura por palavras-chave
      const keywordMatch = this.findSubpromptByKeywords(userQuery.toLowerCase());
      if (keywordMatch) {
        console.log(`Selected subprompt via keywords: ${keywordMatch.name}`);
        return keywordMatch.content;
      }
      
      // Se ainda não encontrou, retorna uma string vazia
      console.log("No suitable subprompt found for the query");
      return "";
    } catch (error) {
      console.error("Error selecting subprompt:", error);
      return "";
    }
  }

  /**
   * Encontra um subprompt com base em palavras-chave na consulta do usuário
   */
  private findSubpromptByKeywords(userQuery: string): Subprompt | null {
    if (!this.subpromptCache || this.subpromptCache.length === 0) {
      return null;
    }
    
    // Para cada subprompt, conta quantas palavras-chave estão presentes na consulta
    const matches = this.subpromptCache.map(subprompt => {
      if (!Array.isArray(subprompt.keywords) || subprompt.keywords.length === 0) {
        return { subprompt, count: 0 };
      }
      
      const count = subprompt.keywords.filter(keyword => 
        userQuery.includes(keyword.toLowerCase())
      ).length;
      
      return { subprompt, count };
    });
    
    // Ordena por número de correspondências (maior primeiro)
    matches.sort((a, b) => b.count - a.count);
    
    // Retorna o subprompt com mais palavras-chave correspondentes, se houver pelo menos uma
    if (matches[0] && matches[0].count > 0) {
      return matches[0].subprompt;
    }
    
    return null;
  }

  /**
   * Inicializa o banco de dados com subprompts padrão
   */
  async seedSubpromptsFromDocument(document: string): Promise<number> {
    try {
      const sections = this.parseSubpromptsDocument(document);
      let createdCount = 0;

      // Para cada seção, cria um subprompt
      for (const section of sections) {
        // Verifica se já existe um subprompt com este nome
        const [existingSubprompt] = await db
          .select()
          .from(subprompts)
          .where(eq(subprompts.name, section.name));

        if (!existingSubprompt) {
          // Cria o novo subprompt
          await this.createSubprompt({
            name: section.name,
            description: section.description,
            keywords: section.keywords,
            content: section.content || "This is a default content for " + section.name,
            sphere: section.name.replace(" Sphere", ""),
            active: true
          });
          createdCount++;
        }
      }

      // Atualiza o cache após a inicialização
      this.subpromptCache = null;
      await this.updateCacheIfNeeded();

      console.log(`Seeded ${createdCount} subprompts from document`);
      return createdCount;
    } catch (error) {
      console.error("Error seeding subprompts from document:", error);
      return 0;
    }
  }

  /**
   * Analisa o documento de subprompts para extrair as informações
   */
  private parseSubpromptsDocument(document: string): {
    name: string;
    description: string;
    keywords: string[];
    content?: string;
  }[] {
    const sections: {
      name: string;
      description: string;
      keywords: string[];
      content?: string;
    }[] = [];

    try {
      // Encontra a seção "Subprompts:"
      const subpromptsSection = document.split("## Subprompts:")[1];
      if (!subpromptsSection) return sections;

      // Extrai as seções de subprompt (começando com ###)
      const sphereSections = subpromptsSection.split(/###\s+\d+\.\s+/).slice(1);

      for (const section of sphereSections) {
        const lines = section.trim().split("\n");
        const name = lines[0].trim() + " Sphere";
        
        // Extrai a descrição (começa com *   **Description:** e termina com *)
        const descriptionMatch = section.match(/\*\s+\*\*Description:\*\*\s+(.*?)\*\s+\*\*Keywords:/s);
        const description = descriptionMatch ? descriptionMatch[1].trim() : "";
        
        // Extrai as palavras-chave (começa com *   **Keywords:** e termina com o final da linha)
        const keywordsMatch = section.match(/\*\s+\*\*Keywords:\*\*\s+(.*?)(\n|$)/);
        const keywordsText = keywordsMatch ? keywordsMatch[1].trim() : "";
        const keywords = keywordsText.split(/,\s*/).map(k => k.trim().toLowerCase());

        // Adiciona à lista de seções
        sections.push({
          name,
          description,
          keywords,
          content: `You are now providing assistance in the ${name} domain. ${description} Focus on the following aspects: ${keywords.join(", ")}.`
        });
      }

      return sections;
    } catch (error) {
      console.error("Error parsing subprompts document:", error);
      return sections;
    }
  }
}

// Função auxiliar para gerar um hash simples para uma string
function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}

// Singleton para uso em toda a aplicação
export const subpromptService = new SubpromptService();