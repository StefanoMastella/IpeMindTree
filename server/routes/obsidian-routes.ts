import { Express, Request, Response } from 'express';
import { obsidianService } from '../services/obsidian-service';
import { canvasParser } from '../services/canvas-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = uuidv4().substring(0, 8);
    cb(null, `${Date.now()}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

/**
 * Registra as rotas para o Obsidian
 * @param app Express application
 */
export function registerObsidianRoutes(app: Express) {
  // Rota para obter todos os nós do Obsidian
  app.get('/api/obsidian/nodes', async (_req: Request, res: Response) => {
    try {
      const nodes = await obsidianService.getAllNodes();
      res.json(nodes);
    } catch (error) {
      console.error('Erro ao buscar nós do Obsidian:', error);
      res.status(500).json({ error: 'Erro ao buscar nós do Obsidian' });
    }
  });

  // Rota para obter um nó específico
  app.get('/api/obsidian/nodes/:id', async (req: Request, res: Response) => {
    try {
      const nodeId = parseInt(req.params.id);
      if (isNaN(nodeId)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const node = await obsidianService.getNodeById(nodeId);
      if (!node) {
        return res.status(404).json({ error: 'Nó não encontrado' });
      }

      res.json(node);
    } catch (error) {
      console.error('Erro ao buscar nó do Obsidian:', error);
      res.status(500).json({ error: 'Erro ao buscar nó do Obsidian' });
    }
  });

  // Rota para obter os links de um nó
  app.get('/api/obsidian/nodes/:id/links', async (req: Request, res: Response) => {
    try {
      const nodeId = parseInt(req.params.id);
      if (isNaN(nodeId)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const links = await obsidianService.getNodeLinks(nodeId);
      res.json(links);
    } catch (error) {
      console.error('Erro ao buscar links do nó:', error);
      res.status(500).json({ error: 'Erro ao buscar links do nó' });
    }
  });

  // Rota para obter os dados da rede para visualização
  app.get('/api/obsidian/network', async (_req: Request, res: Response) => {
    try {
      const networkData = await obsidianService.getNetworkData();
      res.json(networkData);
    } catch (error) {
      console.error('Erro ao buscar dados da rede:', error);
      res.status(500).json({ error: 'Erro ao buscar dados da rede' });
    }
  });

  // Rota para buscar nós por palavras-chave
  app.get('/api/obsidian/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: 'Consulta de busca não fornecida' });
      }

      const keywords = query.split(' ').filter(k => k.length > 0);
      const nodes = await obsidianService.findRelevantNodes(keywords);
      res.json(nodes);
    } catch (error) {
      console.error('Erro ao buscar nós:', error);
      res.status(500).json({ error: 'Erro ao buscar nós' });
    }
  });

  // Rota para importação de arquivos
  app.post('/api/obsidian/import', upload.array('files'), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Lê os arquivos enviados
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const content = fs.readFileSync(file.path, 'utf8');
          return {
            name: file.originalname,
            content
          };
        })
      );

      // Verifica se deve forçar a criação de novos nós
      const forceNew = req.body.forceNew === 'true' || req.body.forceNew === true;
      
      // Processa e importa os arquivos
      const username = req.user?.username || 'anonymous';
      const success = await obsidianService.importFromFiles(fileContents, username, forceNew);

      // Limpa os arquivos temporários
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error(`Erro ao excluir arquivo temporário ${file.path}:`, err);
        }
      });

      if (success) {
        res.json({ success, message: 'Arquivos importados com sucesso' });
      } else {
        res.status(500).json({ success, error: 'Erro ao importar arquivos' });
      }
    } catch (error) {
      console.error('Erro ao importar arquivos:', error);
      res.status(500).json({ error: 'Erro ao importar arquivos' });
    }
  });

  // Rota para importação de URL
  app.post('/api/obsidian/import-url', async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL não fornecida' });
      }

      const username = req.user?.username || 'anonymous';
      const success = await obsidianService.importFromUrl(url, username);

      if (success) {
        res.json({ success, message: 'Arquivos importados com sucesso' });
      } else {
        res.status(500).json({ success, error: 'Erro ao importar arquivos da URL' });
      }
    } catch (error) {
      console.error('Erro ao importar arquivos da URL:', error);
      res.status(500).json({ error: 'Erro ao importar arquivos da URL' });
    }
  });

  // Rota para obter logs de importação
  app.get('/api/obsidian/import-logs', async (_req: Request, res: Response) => {
    try {
      const logs = await obsidianService.getImportLogs();
      res.json(logs);
    } catch (error) {
      console.error('Erro ao buscar logs de importação:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de importação' });
    }
  });
}