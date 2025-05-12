import { storage } from "../storage";
import { db } from "../db";
import { subprompts, type InsertSubprompt, type Subprompt } from "@shared/schema";
import { eq } from "drizzle-orm";
import computeCosineSimilarity from "compute-cosine-similarity";

interface SubpromptWithEmbedding extends Subprompt {
  embedding: number[];
}

// Subprompts em memória para uso em caso de falha do banco de dados
const FALLBACK_SUBPROMPTS: {
  id: number;
  title: string;
  description: string;
  keywords: string[];
  content: string;
  branch: string;
  active: boolean;
  category: string;
}[] = [
  {
    id: 1,
    title: "Governance Branch",
    description: "Used for tasks related to exploring and prototyping new governance systems for the city of the future, focusing on AI and blockchain.",
    keywords: ["decentralized governance", "decision-making", "community participation", "resource allocation", "digital identity", "reputation", "dao", "voting", "consensus"],
    content: "You are now providing assistance in the Governance Branch domain. Used for tasks related to exploring and prototyping new governance systems for the city of the future, focusing on AI and blockchain. Focus on the following aspects: decentralized governance, decision-making, community participation, resource allocation, digital identity, reputation, dao, voting, consensus.",
    branch: "Governance",
    active: true,
    category: "branch"
  },
  {
    id: 2,
    name: "Finance Sphere",
    description: "Used for tasks related to developing innovative financial solutions that are more open, transparent, global, and inclusive.",
    keywords: ["defi", "crypto-economics", "alternative currencies", "impact investing", "funding", "blockchain", "tokenization", "circular economy"],
    content: "You are now providing assistance in the Finance Sphere domain. Used for tasks related to developing innovative financial solutions that are more open, transparent, global, and inclusive. Focus on the following aspects: defi, crypto-economics, alternative currencies, impact investing, funding, blockchain, tokenization, circular economy.",
    branch: "Finance",
    active: true
  },
  {
    id: 3,
    name: "Education Branch",
    description: "Used for tasks related to leveraging the internet and AI to create an education system that is widely accessible, personalized, free, and fosters critical thinking and creativity.",
    keywords: ["personalized learning", "ai", "tutoring", "knowledge sharing", "skills", "credentials", "lifelong learning", "decentralized education"],
    content: "You are now providing assistance in the Education Branch domain. Used for tasks related to leveraging the internet and AI to create an education system that is widely accessible, personalized, free, and fosters critical thinking and creativity. Focus on the following aspects: personalized learning, ai, tutoring, knowledge sharing, skills, credentials, lifelong learning, decentralized education.",
    branch: "Education",
    active: true
  },
  {
    id: 4,
    name: "Health Branch",
    description: "Used for tasks related to using digital technologies and AI to build a more personalized, preventive, real-time, and affordable healthcare system.",
    keywords: ["telemedicine", "remote monitoring", "diagnostics", "personalized medicine", "health data", "well-being", "prevention", "ai"],
    content: "You are now providing assistance in the Health Branch domain. Used for tasks related to using digital technologies and AI to build a more personalized, preventive, real-time, and affordable healthcare system. Focus on the following aspects: telemedicine, remote monitoring, diagnostics, personalized medicine, health data, well-being, prevention, ai.",
    branch: "Health",
    active: true
  },
  {
    id: 5,
    name: "Technology Branch",
    description: "Used for tasks related to exploring and developing the underlying technologies that power the IMT and the Ipê City ecosystem.",
    keywords: ["blockchain", "ai", "ml", "data science", "cybersecurity", "decentralized infrastructure", "open source", "apis", "development"],
    content: "You are now providing assistance in the Technology Branch domain. Used for tasks related to exploring and developing the underlying technologies that power the IMT and the Ipê City ecosystem. Focus on the following aspects: blockchain, ai, ml, data science, cybersecurity, decentralized infrastructure, open source, apis, development.",
    branch: "Technology",
    active: true
  },
  {
    id: 6,
    name: "Community Branch",
    description: "Used for tasks related to strengthening the IMT community, promoting collaboration, knowledge sharing, and mutual support.",
    keywords: ["integration", "events", "communication", "conflict resolution", "diversity", "inclusion", "participation", "engagement", "mentorship"],
    content: "You are now providing assistance in the Community Branch domain. Used for tasks related to strengthening the IMT community, promoting collaboration, knowledge sharing, and mutual support. Focus on the following aspects: integration, events, communication, conflict resolution, diversity, inclusion, participation, engagement, mentorship.",
    branch: "Community",
    active: true
  },
  {
    id: 7,
    name: "Resources Branch",
    description: "Used for tasks related to curating and sharing valuable resources for members of the IMT.",
    keywords: ["funding", "educational materials", "mentorship programs", "tools", "software", "experts", "opportunities", "grants", "calls for proposals"],
    content: "You are now providing assistance in the Resources Sphere domain. Used for tasks related to curating and sharing valuable resources for members of the IMT. Focus on the following aspects: funding, educational materials, mentorship programs, tools, software, experts, opportunities, grants, calls for proposals.",
    sphere: "Resources",
    active: true
  },
  {
    id: 8,
    name: "Projects Sphere",
    description: "Used for tasks related to showcasing and supporting the projects being developed within the IMT ecosystem.",
    keywords: ["proposals", "team formation", "tracking", "feedback", "mentorship", "funding", "prototypes", "development", "innovation"],
    content: "You are now providing assistance in the Projects Sphere domain. Used for tasks related to showcasing and supporting the projects being developed within the IMT ecosystem. Focus on the following aspects: proposals, team formation, tracking, feedback, mentorship, funding, prototypes, development, innovation.",
    sphere: "Projects",
    active: true
  },
  {
    id: 9,
    name: "Acoustical Governance Sphere",
    description: "Used for tasks related to promoting better sound control and the integration of sound healing practices in public and private spaces.",
    keywords: ["monitoring", "analysis", "scoring", "incentives", "engagement", "sound", "noise", "acoustics", "healing", "well-being"],
    content: "You are now providing assistance in the Acoustical Governance Sphere domain. Used for tasks related to promoting better sound control and the integration of sound healing practices in public and private spaces. Focus on the following aspects: monitoring, analysis, scoring, incentives, engagement, sound, noise, acoustics, healing, well-being.",
    sphere: "Acoustical Governance",
    active: true
  },
  {
    id: 10,
    name: "DracoLogos Sphere",
    description: "Used for tasks related to fostering creative expression and artistic innovation within the IMT community.",
    keywords: ["art", "music", "storytelling", "design", "audiovisual", "culture", "expression", "creativity", "inspiration"],
    content: "You are now providing assistance in the DracoLogos Sphere domain. Used for tasks related to fostering creative expression and artistic innovation within the IMT community. Focus on the following aspects: art, music, storytelling, design, audiovisual, culture, expression, creativity, inspiration.",
    sphere: "DracoLogos",
    active: true
  },
  {
    id: 11,
    name: "Techno-Optimism Sphere",
    description: "Used for tasks related to promoting a positive and forward-looking perspective on the potential of technology to solve global challenges and improve the quality of life.",
    keywords: ["success", "innovation", "experimentation", "learning", "future", "progress", "hope", "solutions", "impact"],
    content: "You are now providing assistance in the Techno-Optimism Sphere domain. Used for tasks related to promoting a positive and forward-looking perspective on the potential of technology to solve global challenges and improve the quality of life. Focus on the following aspects: success, innovation, experimentation, learning, future, progress, hope, solutions, impact.",
    sphere: "Techno-Optimism",
    active: true
  },
  {
    id: 12,
    name: "Ethics & Values Sphere",
    description: "Used for tasks related to ensuring that all activities within the IMT are aligned with ethical principles and the values of the community.",
    keywords: ["privacy", "security", "transparency", "responsibility", "justice", "social responsibility", "integrity", "ethics", "values"],
    content: "You are now providing assistance in the Ethics & Values Sphere domain. Used for tasks related to ensuring that all activities within the IMT are aligned with ethical principles and the values of the community. Focus on the following aspects: privacy, security, transparency, responsibility, justice, social responsibility, integrity, ethics, values.",
    sphere: "Ethics & Values",
    active: true
  }
];

/**
 * Serviço para gerenciar os subprompts do IMT
 * Responsável por armazenar, selecionar e gerenciar subprompts para o LLM
 */
export class SubpromptService {
  // Cache de subprompts para evitar consultas repetidas ao banco de dados
  private subpromptCache: SubpromptWithEmbedding[] | null = null;
  private lastCacheUpdate: Date = new Date(0); // Data de última atualização do cache
  private useFallback: boolean = false; // Indica se deve usar os dados em memória em vez do banco de dados

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
        if (this.useFallback) {
          // Se estiver usando fallback, carrega os dados em memória
          this.loadFallbackSubprompts();
        } else {
          // Busca todos os subprompts ativos no banco de dados
          const allSubprompts = await this.getAllSubprompts();
          if (allSubprompts.length > 0) {
            this.subpromptCache = allSubprompts.filter(sp => sp.active);
            this.lastCacheUpdate = now;
            console.log(`Subprompt cache updated with ${this.subpromptCache.length} active subprompts`);
          } else {
            // Se não retornou dados do banco, usa os dados em memória como fallback
            console.log("No subprompts found in database, using fallback data");
            this.useFallback = true;
            this.loadFallbackSubprompts();
          }
        }
      } catch (error) {
        console.error("Error updating subprompt cache:", error);
        // Se houver um erro, ativa o modo fallback e usa os dados em memória
        this.useFallback = true;
        this.loadFallbackSubprompts();
      }
    }
  }

  /**
   * Carrega os subprompts de fallback (em memória) para o cache
   */
  private loadFallbackSubprompts(): void {
    // Converte os fallback subprompts para o formato correto do banco de dados
    this.subpromptCache = FALLBACK_SUBPROMPTS.map(sp => {
      // Converte 'name' para 'title' para todos os subprompts que têm 'name' em vez de 'title'
      const title = (sp as any).name || sp.title;
      
      // Para subprompts que usam 'sphere' em vez de 'branch'
      const branch = sp.branch || (sp as any).sphere || null;
      
      // Cria um objeto que corresponde à estrutura do banco de dados
      const formattedSubprompt: SubpromptWithEmbedding = {
        id: sp.id,
        title: title,
        content: sp.content,
        description: sp.description || null,
        keywords: sp.keywords || null,
        branch: branch,
        category: sp.category || null,
        user_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        usage_count: 0,
        active: sp.active !== undefined ? sp.active : true,
        embedding: [] // Os embeddings serão gerados sob demanda
      };
      
      return formattedSubprompt;
    });
    
    this.lastCacheUpdate = new Date();
    console.log(`Loaded ${this.subpromptCache.length} fallback subprompts into cache`);
  }

  /**
   * Obtém todos os subprompts armazenados
   */
  async getAllSubprompts(): Promise<SubpromptWithEmbedding[]> {
    if (this.useFallback) {
      // Se estiver em modo fallback, retorna os dados em memória
      return FALLBACK_SUBPROMPTS.map(sp => ({
        ...sp,
        createdAt: new Date(),
        updatedAt: new Date(),
        embedding: []
      }));
    }

    try {
      const subpromptsList = await db.select().from(subprompts);
      
      if (subpromptsList.length === 0) {
        throw new Error("No subprompts found in database");
      }
      
      return subpromptsList.map(sp => ({
        ...sp,
        embedding: sp.embedding ? (sp.embedding as unknown as number[]) : []
      }));
    } catch (error) {
      console.error("Error fetching subprompts:", error);
      // Ativa o modo fallback para as próximas chamadas
      this.useFallback = true;
      
      // Retorna os dados em memória
      return FALLBACK_SUBPROMPTS.map(sp => ({
        ...sp,
        createdAt: new Date(),
        updatedAt: new Date(),
        embedding: []
      }));
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
    if (!userQuery) {
      console.log("Empty user query provided to selectSubprompt");
      return "";
    }
    
    try {
      // Atualiza o cache se necessário (pode ativar o modo fallback)
      await this.updateCacheIfNeeded();
      
      // Se não há subprompts no cache, retorna uma string vazia
      if (!this.subpromptCache || this.subpromptCache.length === 0) {
        console.log("No subprompts available in cache");
        return "";
      }
      
      // Se estivermos usando dados em memória, podemos pular o processo de embedding
      // e ir direto para a pesquisa por palavras-chave (mais rápido e eficiente)
      if (this.useFallback) {
        // Procura por palavras-chave na consulta
        const keywordMatch = this.findSubpromptByKeywords(userQuery.toLowerCase());
        if (keywordMatch) {
          console.log(`Selected fallback subprompt via keywords: ${keywordMatch.name}`);
          return keywordMatch.content;
        }
        
        // Se não encontrou por palavras-chave, tenta buscar o melhor subprompt genérico
        // com base na similaridade de texto entre o nome da esfera e a consulta
        const bestMatch = this.findBestFallbackMatch(userQuery);
        if (bestMatch) {
          console.log(`Selected best fallback match: ${bestMatch.name}`);
          return bestMatch.content;
        }
        
        // We'll no longer force Finance Sphere as default
        // Instead, return empty string to use the main prompt without a subprompt
        console.log("No matching subprompt found, using main prompt only");
        return "";
      }
      
      // Fluxo normal quando estamos usando o banco de dados
      
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
      similarities.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      
      // Verifica se a melhor correspondência tem uma similaridade significativa
      if (similarities[0] && similarities[0].similarity && similarities[0].similarity > 0.5) {
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
   * Encontra o melhor subprompt fallback baseado em uma simples
   * comparação de texto (para uso quando estamos em modo fallback)
   */
  private findBestFallbackMatch(userQuery: string): Subprompt | null {
    if (!this.subpromptCache || this.subpromptCache.length === 0) {
      return null;
    }
    
    const query = userQuery.toLowerCase();
    
    // Mapeia cada esfera com uma pontuação simples baseada em quantas
    // vezes as palavras do nome ou descrição aparecem na consulta
    const scores = this.subpromptCache.map(subprompt => {
      let score = 0;
      
      // Verifica se o branch ou title existe e aparece na consulta
      const branchName = subprompt.branch ? subprompt.branch.toLowerCase() : '';
      if (branchName && query.includes(branchName)) {
        score += 5; // Pontuação alta se o branch estiver presente
      }
      
      const titleName = subprompt.title ? subprompt.title.toLowerCase() : '';
      if (titleName && query.includes(titleName)) {
        score += 5; // Pontuação alta se o título estiver presente
      }
      
      // Verifica palavras da descrição (se existir)
      if (subprompt.description) {
        const descWords = subprompt.description.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        for (const word of descWords) {
          if (query.includes(word)) {
            score += 1;
          }
        }
      }
      
      return { subprompt, score };
    });
    
    // Ordena por pontuação (maior primeiro)
    scores.sort((a, b) => b.score - a.score);
    
    // Retorna o subprompt com maior pontuação, se tiver alguma pontuação
    if (scores[0] && scores[0].score > 0) {
      return scores[0].subprompt;
    }
    
    return null;
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
        // Usando abordagem alternativa sem flag /s (dotAll)
        const descPattern = /\*\s+\*\*Description:\*\*\s+([\s\S]*?)\*\s+\*\*Keywords:/;
        const descriptionMatch = section.match(descPattern);
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