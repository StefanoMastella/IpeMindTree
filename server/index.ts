import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { initializeTelegramBot } from "./telegram/bot";
import { subpromptService } from "./services/subprompt-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuration to serve static files from the uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize the database with sample data
  try {
    await (storage as any).seedInitialData();
  } catch (error) {
    console.error("Error seeding database:", error);
  }
  
  // Initialize subprompts from the IMT Grimory file
  try {
    const subpromptsPath = path.join(process.cwd(), 'attached_assets', 'IMT Grimory of Subprompts.md');
    if (fs.existsSync(subpromptsPath)) {
      const document = fs.readFileSync(subpromptsPath, 'utf-8');
      const created = await subpromptService.seedSubpromptsFromDocument(document);
      if (created > 0) {
        console.log(`Successfully initialized ${created} subprompts from IMT Grimory document`);
      } else {
        console.log('No new subprompts created from document, possibly already initialized');
      }
    } else {
      console.error('IMT Grimory of Subprompts.md file not found in attached_assets folder');
    }
  } catch (error) {
    console.error("Error initializing subprompts:", error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Log environment variables for debugging
    log(`NODE_ENV: ${process.env.NODE_ENV}`);
    
    // Always initialize the Telegram bot
    try {
      initializeTelegramBot();
      log('Telegram bot initialized');
    } catch (error) {
      console.error('Error initializing Telegram bot:', error);
    }
  });
})();
