import { Request, Response, NextFunction, Express } from 'express';
import { storage } from './storage';
import { InsertUser, User } from '@shared/schema';
import { hashSync, compareSync } from 'bcrypt';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { randomBytes } from 'crypto';

// Tipo para extender o objeto de Request com usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Função para criar hash seguro de senha
function hashPassword(password: string): string {
  return hashSync(password, 10);
}

// Função para verificar senha
function comparePasswords(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

// Configurar middleware de sessão
const configureSessionMiddleware = (app: Express) => {
  const MemoryStoreSession = MemoryStore(session);
  
  // Gerar chave de sessão secreta
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // Limpar sessões expiradas uma vez por dia
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 semana
    }
  }));
};

// Middleware para verificar autenticação
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Não autorizado. Por favor, faça login.' });
  }
  next();
};

// Middleware para anexar os dados do usuário às requisições autenticadas
const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        // Omitir senha antes de anexar o usuário ao request
        const { password, ...safeUser } = user;
        req.user = safeUser as User;
      }
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
    }
  }
  next();
};

// Configurar rotas de autenticação
export function setupAuthRoutes(app: Express) {
  configureSessionMiddleware(app);
  app.use(attachUser);
  
  // Rota de registro
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData: InsertUser = req.body;
      
      // Verificar se usuário já existe
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Nome de usuário já está em uso.' });
      }
      
      // Criar usuário com senha criptografada
      const hashedUser = {
        ...userData,
        password: hashPassword(userData.password)
      };
      
      const newUser = await storage.createUser(hashedUser);
      
      // Iniciar sessão
      req.session.userId = newUser.id;
      
      // Retornar usuário sem a senha
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ message: 'Erro ao registrar usuário.' });
    }
  });
  
  // Rota de login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Buscar usuário
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }
      
      // Verificar senha
      if (!comparePasswords(password, user.password)) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }
      
      // Iniciar sessão
      req.session.userId = user.id;
      
      // Retornar usuário sem a senha
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro ao fazer login.' });
    }
  });
  
  // Rota de logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Erro ao fazer logout:', err);
        return res.status(500).json({ message: 'Erro ao fazer logout.' });
      }
      res.json({ message: 'Logout realizado com sucesso.' });
    });
  });
  
  // Rota para obter usuário atual
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json(req.user);
  });
}

export { requireAuth };