import { Telegraf, session, Markup, Context } from 'telegraf';
import { ragService } from '../services/rag-service';
import { message } from 'telegraf/filters';
import { storage } from '../storage';
import { Update, CallbackQuery } from 'telegraf/typings/core/types/typegram';

// Interface for user session data
interface SessionData {
  // Idea creation process state
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

// Extending Telegraf context to include session data
interface BotContext extends Context {
  session: SessionData;
}

/**
 * Class that manages the Telegram bot integrated with Ipê Mind Tree
 */
export class TelegramBot {
  private bot: Telegraf<BotContext>;
  
  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.setupMiddleware();
    this.setupCommands();
  }
  
  /**
   * Configure middleware and session state
   */
  private setupMiddleware() {
    // Inicializa o middleware de sessão com tipo correto
    this.bot.use(session<SessionData>());
    
    // Log de mensagens recebidas
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log('Telegram bot - %s - %sms', ctx.updateType, ms);
    });
  }
  
  /**
   * Function to handle idea creation steps
   */
  private async handleIdeaCreationStep(ctx: BotContext, text: string) {
    const { ideaCreation } = ctx.session;
    
    if (!ideaCreation) return;
    
    const cancelButton = Markup.inlineKeyboard([
      Markup.button.callback('Cancelar', 'cancel_idea_creation')
    ]);
    
    switch (ideaCreation.step) {
      case 'title':
        // Salvar o título
        ideaCreation.data.title = text;
        
        // Avançar para a descrição
        ideaCreation.step = 'description';
        
        await ctx.reply(
          '📝 Great title! Now, please provide a *detailed description* of your idea.\n\n' +
          'Try to explain the problem your idea solves, how it works or would be implemented, and what impact you expect it to have.',
          { 
            parse_mode: 'Markdown',
            ...cancelButton
          }
        );
        break;
        
      case 'description':
        // Salvar a descrição
        ideaCreation.data.description = text;
        
        // Avançar para as tags
        ideaCreation.step = 'tags';
        
        await ctx.reply(
          '🏷️ Excellent! Now, add some *tags* to categorize your idea.\n\n' +
          'Type the tags separated by commas. For example: "education, sustainability, technology"',
          { 
            parse_mode: 'Markdown',
            ...cancelButton
          }
        );
        break;
        
      case 'tags':
        // Processar e salvar as tags
        const tagsList = text.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        
        ideaCreation.data.tags = tagsList;
        
        // Avançar para o autor
        ideaCreation.step = 'author';
        
        await ctx.reply(
          '👤 Almost there! Please provide your *name* to credit you as the author of the idea.\n\n' +
          'You can use your full name or just your first name.',
          { 
            parse_mode: 'Markdown',
            ...cancelButton
          }
        );
        break;
        
      case 'author':
        // Salvar o autor
        ideaCreation.data.author = text;
        
        // Avançar para confirmação
        ideaCreation.step = 'confirm';
        
        // Preparar mensagem de resumo
        const summary = 
          `*Summary of your idea:*\n\n` +
          `*Title:* ${ideaCreation.data.title}\n\n` +
          `*Description:* ${ideaCreation.data.description}\n\n` +
          `*Tags:* ${ideaCreation.data.tags?.join(', ') || 'None'}\n\n` +
          `*Author:* ${ideaCreation.data.author}\n\n` +
          `Would you like to share this idea on Ipê Mind Tree?`;
        
        // Botões de confirmação
        const confirmButtons = Markup.inlineKeyboard([
          Markup.button.callback('✅ Yes, share', 'confirm_idea'),
          Markup.button.callback('❌ No, cancel', 'cancel_idea_creation')
        ]);
        
        await ctx.reply(summary, { 
          parse_mode: 'Markdown',
          ...confirmButtons
        });
        break;
    }
  }
  
  /**
   * Configure commands and message handlers
   */
  private setupCommands() {
    // Comando de início
    this.bot.start((ctx) => {
      ctx.reply(
        `Hello, ${ctx.from?.first_name || 'visitor'}! 👋\n\nWelcome to the Ipê Mind Tree Bot!\n\n` +
        'Here you can query and explore ideas shared in our community.\n\n' +
        'Use /help to see available commands.'
      );
    });
    
    // Comando de ajuda
    this.bot.command('help', (ctx) => {
      ctx.reply(
        'Available commands:\n\n' +
        '/start - Start a conversation with the bot\n' +
        '/help - Shows this help message\n' +
        '/ideas - Lists the most recent ideas\n' +
        '/about - Information about Ipê Mind Tree\n' +
        '/newidea - Share a new idea on the platform\n\n' +
        'You can also simply send a question to directly query ' +
        'our knowledge base!'
      );
    });
    
    // Comando para criar uma nova ideia
    this.bot.command('newidea', (ctx) => {
      // Inicializar a sessão de criação de ideia
      ctx.session = {
        ideaCreation: {
          step: 'title',
          data: {}
        }
      };
      
      // Botão para cancelar o processo
      const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('Cancel', 'cancel_idea_creation')
      ]);
      
      ctx.reply(
        '🌟 Let\'s share a new idea on Ipê Mind Tree! 🌟\n\n' +
        'First, what is the *title* of your idea? Try to be concise and clear.\n\n' +
        'For example: "Creative Recycling Workshop" or "Book Sharing Application"',
        { 
          parse_mode: 'Markdown',
          ...keyboard
        }
      );
    });
    
    // Callback para cancelar a criação de ideia
    this.bot.action('cancel_idea_creation', (ctx) => {
      // Limpar a sessão
      ctx.session = {};
      
      // Confirmar o cancelamento
      ctx.editMessageText('Criação de ideia cancelada. Você pode começar novamente quando quiser com /newidea.');
    });
    
    // Callback para confirmar a criação de ideia
    this.bot.action('confirm_idea', async (ctx) => {
      if (!ctx.session?.ideaCreation?.data) {
        return ctx.reply('Ocorreu um erro. Por favor, tente novamente com /newidea.');
      }
      
      const { title, description, tags, author } = ctx.session.ideaCreation.data;
      
      if (!title || !description || !author) {
        return ctx.reply('Informações incompletas. Por favor, tente novamente com /newidea.');
      }
      
      try {
        // Editar a mensagem para indicar processamento
        await ctx.editMessageText(
          'Compartilhando sua ideia... Por favor, aguarde. ⏳'
        );
        
        // Criar a ideia no sistema
        const ideaData = {
          title,
          description,
          tags: tags || [],
          links: [],  // Campo obrigatório conforme schema
          author
        };
        
        // Chamar a API para criar a ideia
        const idea = await storage.createIdea(ideaData);
        
        // Limpar a sessão
        ctx.session = {};
        
        // Enviar confirmação
        await ctx.reply(
          `✅ *Ideia compartilhada com sucesso!*\n\n` +
          `Sua ideia "${title}" foi adicionada ao Ipê Mind Tree com o ID #${idea.id}.\n\n` +
          `Obrigado por contribuir para a nossa comunidade de conhecimento! 🌳`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Erro ao criar ideia:', error);
        await ctx.reply(
          'Desculpe, ocorreu um erro ao compartilhar sua ideia. Por favor, tente novamente mais tarde.'
        );
      }
    });
    
    // Comando sobre
    this.bot.command('about', (ctx) => {
      ctx.reply(
        'Ipê Mind Tree 🌳\n\n' +
        'A collaborative knowledge platform that allows you to capture, ' +
        'connect and explore ideas fluidly through an interface ' +
        'powered by artificial intelligence.\n\n' +
        'Ipê Mind Tree is part of the Ipê City ecosystem, promoting ' +
        'collective intelligence through technology.\n\n' +
        'Visit: https://ipemindtree.com'
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
          message += `   Tags: ${Array.isArray(idea.tags) ? idea.tags.join(", ") : 'Nenhuma'}\n\n`;
        });
        
        message += 'Para saber mais sobre uma ideia específica, pergunte sobre ela pelo título ou número.';
        
        ctx.replyWithMarkdown(message);
      } catch (error) {
        console.error('Erro ao buscar ideias recentes:', error);
        ctx.reply('Desculpe, não consegui recuperar as ideias mais recentes. Por favor, tente novamente mais tarde.');
      }
    });
    
    // Manipulador para mensagens de texto (criação de ideias ou consultas RAG)
    this.bot.on(message('text'), async (ctx) => {
      const userText = ctx.message.text;
      
      // Ignorar comandos
      if (userText.startsWith('/')) return;
      
      // Verificar se estamos no processo de criação de ideia
      if (ctx.session?.ideaCreation) {
        await this.handleIdeaCreationStep(ctx as BotContext, userText);
        return;
      }
      
      // Se não estamos criando uma ideia, tratar como consulta RAG
      // Indicar que está processando
      const processingMessage = await ctx.reply('Processando sua pergunta... ⏳');
      
      try {
        const response = await ragService.queryRag(userText);
        
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
      console.error('Error in Telegram bot:', err);
      ctx.reply('An error occurred while processing your request. Please try again later.');
    });
  }
  
  /**
   * Inicia o bot do Telegram
   */
  public start() {
    // Iniciar o bot no modo polling
    this.bot.launch();
    console.log('Telegram bot started successfully!');
    
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
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    return;
  }
  
  try {
    const telegramBot = new TelegramBot(token);
    telegramBot.start();
  } catch (error) {
    console.error('Error initializing Telegram bot:', error);
  }
}
