import { Request, Response, NextFunction, Express } from 'express';
import { storage } from './storage';
import { InsertUser, User } from '@shared/schema';
import { hashSync, compareSync } from 'bcrypt';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { randomBytes } from 'crypto';

// Type to extend the Request object with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Function to create secure password hash
function hashPassword(password: string): string {
  return hashSync(password, 10);
}

// Function to verify password
function comparePasswords(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

// Configure session middleware
const configureSessionMiddleware = (app: Express) => {
  const MemoryStoreSession = MemoryStore(session);
  
  // Generate secret session key
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // Clean expired sessions once a day
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
  }));
};

// Middleware to verify authentication
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  next();
};

// Middleware to verify admin authentication
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    next();
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return res.status(500).json({ message: 'Error verifying admin status.' });
  }
};

// Middleware to attach user data to authenticated requests
const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        // Omit password before attaching user to request
        const { password, ...safeUser } = user;
        req.user = safeUser as User;
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }
  next();
};

// Configure authentication routes
export function setupAuthRoutes(app: Express) {
  configureSessionMiddleware(app);
  app.use(attachUser);
  
  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData: InsertUser = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken.' });
      }
      
      // Create user with encrypted password
      const hashedUser = {
        ...userData,
        password: hashPassword(userData.password)
      };
      
      const newUser = await storage.createUser(hashedUser);
      
      // Start session
      req.session.userId = newUser.id;
      
      // Return user without password
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ message: 'Erro ao registrar usuário.' });
    }
  });
  
  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      
      // Verify password
      if (!comparePasswords(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      
      // Start session
      req.session.userId = user.id;
      
      // Return user without password
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error logging in.' });
    }
  });
  
  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error logging out.' });
      }
      res.json({ message: 'Logout successful.' });
    });
  });
  
  // Route to get current user
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json(req.user);
  });
}

export { requireAuth, requireAdmin };