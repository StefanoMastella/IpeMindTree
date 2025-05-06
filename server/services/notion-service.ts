import { Client } from '@notionhq/client';
import { storage } from '../storage';
import { InsertIdea } from '@shared/schema';

/**
 * Service to integrate with Notion API
 * Responsible for fetching and processing project data from Notion
 */
export class NotionService {
  private notion: Client | null;
  private isInitialized = false;

  constructor() {
    this.notion = null;
  }

  /**
   * Initialize the Notion client with API key
   * @param apiKey Notion API key
   */
  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('Notion API key is required');
    }

    this.notion = new Client({ auth: apiKey });
    this.isInitialized = true;
    console.log('Notion service initialized successfully');
  }

  /**
   * Check if the service is initialized
   */
  private checkInitialization(): void {
    if (!this.isInitialized || !this.notion) {
      throw new Error('Notion service is not initialized. Call initialize() with a valid API key first.');
    }
  }

  /**
   * Fetch projects from a Notion database
   * @param databaseId Notion database ID
   */
  async fetchProjects(databaseId: string): Promise<any[]> {
    this.checkInitialization();

    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      });

      return response.results;
    } catch (error: any) {
      console.error('Error fetching projects from Notion:', error);
      throw new Error(`Failed to fetch projects from Notion: ${error.message || String(error)}`);
    }
  }

  /**
   * Import projects from Notion database into the IMT system
   * @param databaseId Notion database ID
   * @param importedBy Name of the user performing the import
   */
  async importProjectsFromNotion(databaseId: string, importedBy: string): Promise<{ imported: number, skipped: number }> {
    this.checkInitialization();

    try {
      console.log(`Starting import from Notion database: ${databaseId}`);
      
      const notionPages = await this.fetchProjects(databaseId);
      console.log(`Fetched ${notionPages.length} projects from Notion`);
      
      let imported = 0;
      let skipped = 0;

      for (const page of notionPages) {
        try {
          // Extract project data from Notion page
          const idea = this.convertNotionPageToIdea(page, importedBy);
          
          // Check if project with same title already exists
          const existingIdeas = await storage.getAllIdeas();
          const existingIdea = existingIdeas.find(i => i.title.toLowerCase() === idea.title.toLowerCase());
          
          if (existingIdea) {
            console.log(`Skipping duplicate project: ${idea.title}`);
            skipped++;
            continue;
          }
          
          // Save project as an idea in the system
          await storage.createIdea(idea);
          console.log(`Imported project: ${idea.title}`);
          imported++;
        } catch (pageError) {
          console.error(`Error processing Notion page:`, pageError);
          skipped++;
        }
      }

      // Create an import log
      await storage.createImportLog({
        source: `Notion (${databaseId})`,
        importedBy,
        nodesCount: imported,
        linksCount: 0,
        timestamp: new Date(),
      });

      return { imported, skipped };
    } catch (error) {
      console.error('Error importing projects from Notion:', error);
      throw new Error(`Failed to import projects from Notion: ${error.message}`);
    }
  }

  /**
   * Convert a Notion page to IMT idea format
   * @param page Notion page object
   * @param importedBy Name of the user who imported the project
   */
  private convertNotionPageToIdea(page: any, importedBy: string): InsertIdea {
    // Get page properties based on database structure
    const props = page.properties;
    
    // Extract basic information (adjust property names based on your Notion database)
    let title = this.extractTextProperty(props.Name) || this.extractTextProperty(props.Title) || 'Untitled Project';
    let description = this.extractTextProperty(props.Description) || '';
    
    // Try to get the rich text content if available
    if (!description && page.content) {
      description = this.extractPageContent(page.content);
    }
    
    // Extract tags if available (assuming tags are a multi-select property in Notion)
    const tags = this.extractMultiSelectProperty(props.Tags) || [];
    
    // Extract author (could be a person property or a text field in Notion)
    let author = this.extractPersonProperty(props.Author) || 
                 this.extractTextProperty(props.Author) || 
                 importedBy;

    // Add import source to description
    description += `\n\nImported from Notion by ${importedBy}`;

    return {
      title,
      description,
      tags,
      links: [], // No links by default
      author,
    };
  }

  /**
   * Extract text from a rich text or title property
   */
  private extractTextProperty(prop: any): string | null {
    if (!prop) return null;

    // Title property
    if (prop.title && Array.isArray(prop.title)) {
      return prop.title.map(t => t.plain_text).join('');
    }
    
    // Rich text property
    if (prop.rich_text && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map(t => t.plain_text).join('');
    }
    
    // Text content in a simple property
    if (prop.content && typeof prop.content === 'string') {
      return prop.content;
    }

    return null;
  }

  /**
   * Extract multi-select values from a property
   */
  private extractMultiSelectProperty(prop: any): string[] | null {
    if (!prop || !prop.multi_select || !Array.isArray(prop.multi_select)) {
      return null;
    }
    
    return prop.multi_select.map(item => item.name);
  }

  /**
   * Extract person name from a property
   */
  private extractPersonProperty(prop: any): string | null {
    if (!prop || !prop.people || !Array.isArray(prop.people) || prop.people.length === 0) {
      return null;
    }
    
    const person = prop.people[0];
    return person.name || null;
  }

  /**
   * Extract content from page blocks
   */
  private extractPageContent(blocks: any[]): string {
    if (!Array.isArray(blocks)) return '';
    
    return blocks
      .filter(block => block.type === 'paragraph' && block.paragraph && block.paragraph.rich_text)
      .map(block => {
        return block.paragraph.rich_text
          .map(text => text.plain_text)
          .join('');
      })
      .join('\n\n');
  }
}

export const notionService = new NotionService();