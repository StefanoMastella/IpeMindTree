import { Telegraf, session, Markup, Context } from 'telegraf';
import { ragService } from '../services/rag-service';
import { message } from 'telegraf/filters';
import { storage } from '../storage';

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
    // Initialize session middleware with correct type
    this.bot.use(session<SessionData>());
    
    // Log received messages
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      console.log('Telegram bot received update:', ctx.updateType);
      try {
        await next();
        const ms = Date.now() - start;
        console.log('Telegram bot processed %s in %sms', ctx.updateType, ms);
      } catch (error) {
        console.error('Error in Telegram middleware:', error);
      }
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
        // Save the title
        ideaCreation.data.title = text;
        
        // Move to description
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
        // Save the description
        ideaCreation.data.description = text;
        
        // Move to tags
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
    // Start command
    this.bot.start((ctx) => {
      ctx.reply(
        `Hello, ${ctx.from?.first_name || 'visitor'}! 👋\n\nWelcome to the Ipê Mind Tree Bot!\n\n` +
        'Here you can query and explore ideas shared in our community.\n\n' +
        'Use /help to see available commands.'
      );
    });
    
    // Help command
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
    
    // Command to create a new idea
    this.bot.command('newidea', (ctx) => {
      // Initialize idea creation session
      ctx.session = {
        ideaCreation: {
          step: 'title',
          data: {}
        }
      };
      
      // Button to cancel the process
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
    
    // Callback to cancel idea creation
    this.bot.action('cancel_idea_creation', (ctx) => {
      // Clear the session
      ctx.session = {};
      
      // Confirm cancellation
      ctx.editMessageText('Idea creation canceled. You can start again anytime with /newidea.');
    });
    
    // Callback to confirm idea creation
    this.bot.action('confirm_idea', async (ctx) => {
      if (!ctx.session?.ideaCreation?.data) {
        return ctx.reply('An error occurred. Please try again with /newidea.');
      }
      
      const { title, description, tags, author } = ctx.session.ideaCreation.data;
      
      if (!title || !description || !author) {
        return ctx.reply('Incomplete information. Please try again with /newidea.');
      }
      
      try {
        // Edit message to indicate processing
        await ctx.editMessageText(
          'Sharing your idea... Please wait. ⏳'
        );
        
        // Create the idea in the system
        const ideaData = {
          title,
          description,
          tags: tags || [],
          links: [],  // Required field according to schema
          author
        };
        
        // Call API to create the idea
        const idea = await storage.createIdea(ideaData);
        
        // Clear the session
        ctx.session = {};
        
        // Send confirmation
        await ctx.reply(
          `✅ *Idea shared successfully!*\n\n` +
          `Your idea "${title}" has been added to Ipê Mind Tree with ID #${idea.id}.\n\n` +
          `Thank you for contributing to our knowledge community! 🌳`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error creating idea:', error);
        await ctx.reply(
          'Sorry, there was an error sharing your idea. Please try again later.'
        );
      }
    });
    
    // About command
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
    
    // Command to list recent ideas
    this.bot.command('ideas', async (ctx) => {
      ctx.reply('Searching for recent ideas... ⏳');
      
      try {
        const recentIdeas = await ragService.getRecentIdeasWithSummaries(5);
        
        if (recentIdeas.length === 0) {
          return ctx.reply('There are no ideas registered in the system yet.');
        }
        
        let message = 'Recent ideas in Ipê Mind Tree:\n\n';
        
        recentIdeas.forEach((idea, index) => {
          message += `${index + 1}. *${idea.title}*\n`;
          message += `   ${idea.summary}\n`;
          message += `   Tags: ${Array.isArray(idea.tags) ? idea.tags.join(", ") : 'None'}\n\n`;
        });
        
        message += 'To learn more about a specific idea, ask about it by title or number.';
        
        ctx.replyWithMarkdown(message);
      } catch (error) {
        console.error('Error fetching recent ideas:', error);
        ctx.reply('Sorry, I couldn\'t retrieve the most recent ideas. Please try again later.');
      }
    });
    
    // Handler for text messages (idea creation or RAG queries)
    this.bot.on(message('text'), async (ctx) => {
      const userText = ctx.message.text;
      
      // Ignore commands
      if (userText.startsWith('/')) return;
      
      // Check if we're in the idea creation process
      if (ctx.session?.ideaCreation) {
        await this.handleIdeaCreationStep(ctx as BotContext, userText);
        return;
      }
      
      // If we're not creating an idea, treat as RAG query
      // Indicate processing
      const processingMessage = await ctx.reply('Processing your question... ⏳');
      
      try {
        const response = await ragService.queryRag(userText);
        
        // Delete "processing" message
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        // Send response
        await ctx.reply(response);
      } catch (error) {
        console.error('Error processing RAG query:', error);
        
        // Delete "processing" message
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        // Send error message
        await ctx.reply('Sorry, I encountered a problem processing your question. Please try again later.');
      }
    });
    
    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Error in Telegram bot:', err);
      ctx.reply('An error occurred while processing your request. Please try again later.');
    });
  }
  
  /**
   * Starts the Telegram bot
   */
  public start() {
    try {
      console.log('Starting Telegram bot...');
      
      // Start the bot in polling mode with proper configuration to avoid conflicts
      this.bot.launch({
        allowedUpdates: ['message', 'callback_query'], // Only listen for these update types
        dropPendingUpdates: true // Important: Drop pending updates to avoid conflicts
      })
      .then(() => {
        console.log('Telegram bot started successfully!');
        console.log('Bot information:', this.bot.botInfo?.username ? 
          `@${this.bot.botInfo.username}` : 'Username not available yet');
      })
      .catch(error => {
        console.error('Failed to launch Telegram bot:', error);
      });
      
      // Configure graceful shutdown
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error('Exception during Telegram bot startup:', error);
    }
  }
}

/**
 * Function to initialize the Telegram bot
 * Checks if the token is available in environment variables
 */
export function initializeTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    return;
  }
  
  // First, check if token is valid by making a direct API call
  console.log('Validating Telegram token...');
  
  // Simple direct bot instance just for token validation
  const bot = new Telegraf(token);
  
  // Get bot information to validate the token
  bot.telegram.getMe()
    .then(botInfo => {
      console.log(`Token is valid! Bot username: @${botInfo.username}`);
      
      // If token is valid, initialize the actual bot
      try {
        const telegramBot = new TelegramBot(token);
        telegramBot.start();
      } catch (error) {
        console.error('Error initializing Telegram bot:', error);
      }
    })
    .catch(error => {
      console.error('Invalid Telegram token or API connection error:', error.message);
    });
}
