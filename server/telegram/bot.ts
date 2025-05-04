import { Telegraf, session, Markup, Context } from 'telegraf';
import { ragService } from '../services/rag-service';
import { message } from 'telegraf/filters';
import { storage } from '../storage';
import { Update, CallbackQuery } from 'telegraf/typings/core/types/typegram';

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
  private bot: Telegraf<BotContext>;
  
  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.setupMiddleware();
    this.setupCommands();
  }
  
  /**
   * Configura middleware e estado da sessão
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
   * Função para lidar com as etapas de criação de ideia
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
          '📝 Ótimo título! Agora, por favor, forneça uma *descrição detalhada* da sua ideia.\n\n' +
          'Tente explicar o problema que sua ideia resolve, como funciona ou seria implementada, e qual o impacto esperado.',
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
          '🏷️ Excelente! Agora, adicione algumas *tags* para categorizar sua ideia.\n\n' +
          'Digite as tags separadas por vírgula. Por exemplo: "educação, sustentabilidade, tecnologia"',
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
          '👤 Quase lá! Por favor, informe seu *nome* para creditá-lo como autor da ideia.\n\n' +
          'Você pode usar seu nome completo ou apenas o primeiro nome.',
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
          `*Resumo da sua ideia:*\n\n` +
          `*Título:* ${ideaCreation.data.title}\n\n` +
          `*Descrição:* ${ideaCreation.data.description}\n\n` +
          `*Tags:* ${ideaCreation.data.tags?.join(', ') || 'Nenhuma'}\n\n` +
          `*Autor:* ${ideaCreation.data.author}\n\n` +
          `Deseja compartilhar esta ideia no Ipê Mind Tree?`;
        
        // Botões de confirmação
        const confirmButtons = Markup.inlineKeyboard([
          Markup.button.callback('✅ Sim, compartilhar', 'confirm_idea'),
          Markup.button.callback('❌ Não, cancelar', 'cancel_idea_creation')
        ]);
        
        await ctx.reply(summary, { 
          parse_mode: 'Markdown',
          ...confirmButtons
        });
        break;
    }
  }
  
  /**
   * Configura comandos e handlers de mensagens
   */
  private setupCommands() {
    // Comando de início
    this.bot.start((ctx) => {
      ctx.reply(
        `Olá, ${ctx.from?.first_name || 'visitante'}! 👋\n\nBem-vindo ao Ipê Mind Tree Bot!\n\n` +
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
        '/about - Informações sobre o Ipê Mind Tree\n' +
        '/newidea - Compartilhe uma nova ideia na plataforma\n\n' +
        'Você também pode simplesmente enviar uma pergunta para consultar ' +
        'diretamente a nossa base de conhecimento!'
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
        Markup.button.callback('Cancelar', 'cancel_idea_creation')
      ]);
      
      ctx.reply(
        '🌟 Vamos compartilhar uma nova ideia no Ipê Mind Tree! 🌟\n\n' +
        'Primeiro, qual é o *título* da sua ideia? Tente ser conciso e claro.\n\n' +
        'Por exemplo: "Oficina de Reciclagem Criativa" ou "Aplicativo de Compartilhamento de Livros"',
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
