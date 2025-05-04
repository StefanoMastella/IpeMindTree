import { Telegraf, session, Markup, Context } from 'telegraf';
import { ragService } from '../services/rag-service';
import { message } from 'telegraf/filters';
import { storage } from '../storage';

// Interface para os dados de sessão do usuário
interface SessionData {
  // Estado do processo de criação de ideia
  ideaCreation?: {
    step: 'title' | 'description' | 'tags' | 'author' | 'confirm';
    data: {
      title?: string;
      description?: string;
      tags?: string[];
      author?: string;
    };
  };
}

// Estendendo o contexto do Telegraf para incluir dados de sessão
interface BotContext extends Context {
  session: SessionData;
}

/**
 * Classe que gerencia o bot do Telegram integrado ao Ipê Mind Tree
 */
export class TelegramBot {
  private bot: Telegraf;
  
  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.setupMiddleware();
    this.setupCommands();
  }
  
  /**
   * Configura middleware e estado da sessão
   */
  private setupMiddleware() {
    this.bot.use(session());
    
    // Log de mensagens recebidas
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log('Telegram bot - %s - %sms', ctx.updateType, ms);
    });
  }
  
  /**
   * Configura comandos e handlers de mensagens
   */
  private setupCommands() {
    // Comando de início
    this.bot.start((ctx) => {
      ctx.reply(
        `Olá, ${ctx.from.first_name}! 👋\n\nBem-vindo ao Ipê Mind Tree Bot!\n\n` +
        'Aqui você pode consultar e explorar as ideias compartilhadas na nossa comunidade.\n\n' +
        'Use /help para ver os comandos disponíveis.'
      );
    });
    
    // Comando de ajuda
    this.bot.command('help', (ctx) => {
      ctx.reply(
        'Comandos disponíveis:\n\n' +
        '/start - Inicia a conversa com o bot\n' +
        '/help - Mostra esta mensagem de ajuda\n' +
        '/ideas - Lista as ideias mais recentes\n' +
        '/about - Informações sobre o Ipê Mind Tree\n\n' +
        'Você também pode simplesmente enviar uma pergunta para consultar ' +
        'diretamente a nossa base de conhecimento!'
      );
    });
    
    // Comando sobre
    this.bot.command('about', (ctx) => {
      ctx.reply(
        'Ipê Mind Tree 🌳\n\n' +
        'Uma plataforma de conhecimento colaborativo que permite capturar, ' +
        'conectar e explorar ideias de forma fluida através de uma interface ' +
        'potencializada por inteligência artificial.\n\n' +
        'O Ipê Mind Tree faz parte do ecossistema de Ipê City, promovendo ' +
        'a inteligência coletiva através da tecnologia.\n\n' +
        'Acesse: https://ipemindtree.com'
      );
    });
    
    // Comando para listar ideias recentes
    this.bot.command('ideas', async (ctx) => {
      ctx.reply('Buscando as ideias mais recentes... ⏳');
      
      try {
        const recentIdeas = await ragService.getRecentIdeasWithSummaries(5);
        
        if (recentIdeas.length === 0) {
          return ctx.reply('Não há ideias cadastradas no sistema ainda.');
        }
        
        let message = 'Ideias recentes na Ipê Mind Tree:\n\n';
        
        recentIdeas.forEach((idea, index) => {
          message += `${index + 1}. *${idea.title}*\n`;
          message += `   ${idea.summary}\n`;
          message += `   Tags: ${Array.isArray(idea.tags) ? idea.tags.join(", ") : idea.tags}\n\n`;
        });
        
        message += 'Para saber mais sobre uma ideia específica, pergunte sobre ela pelo título ou número.';
        
        ctx.replyWithMarkdown(message);
      } catch (error) {
        console.error('Erro ao buscar ideias recentes:', error);
        ctx.reply('Desculpe, não consegui recuperar as ideias mais recentes. Por favor, tente novamente mais tarde.');
      }
    });
    
    // Manipulador para mensagens de texto (consultas RAG)
    this.bot.on(message('text'), async (ctx) => {
      const userQuery = ctx.message.text;
      
      // Ignorar comandos
      if (userQuery.startsWith('/')) return;
      
      // Indicar que está processando
      const processingMessage = await ctx.reply('Processando sua pergunta... ⏳');
      
      try {
        const response = await ragService.queryRag(userQuery);
        
        // Deletar mensagem de "processando"
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        // Enviar resposta
        await ctx.reply(response);
      } catch (error) {
        console.error('Erro ao processar consulta RAG:', error);
        
        // Deletar mensagem de "processando"
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        // Enviar mensagem de erro
        await ctx.reply('Desculpe, encontrei um problema ao processar sua pergunta. Por favor, tente novamente mais tarde.');
      }
    });
    
    // Manipulador de erros
    this.bot.catch((err, ctx) => {
      console.error('Erro no bot do Telegram:', err);
      ctx.reply('Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.');
    });
  }
  
  /**
   * Inicia o bot do Telegram
   */
  public start() {
    // Iniciar o bot no modo polling
    this.bot.launch();
    console.log('Bot do Telegram iniciado com sucesso!');
    
    // Configurar encerramento gracioso
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

/**
 * Função para inicializar o bot do Telegram
 * Verifica se o token está disponível nas variáveis de ambiente
 */
export function initializeTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN não encontrado nas variáveis de ambiente');
    return;
  }
  
  try {
    const telegramBot = new TelegramBot(token);
    telegramBot.start();
  } catch (error) {
    console.error('Erro ao inicializar o bot do Telegram:', error);
  }
}