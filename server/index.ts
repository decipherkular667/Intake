import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';
import { env, isDevelopment, isProduction } from "./env-config";
import { validateSecrets, getSecureConfig } from "./secrets";
import { sessionConfig } from "./session";
import passport from "./auth";
import {
  errorLogger,
  errorHandler,
  notFoundHandler,
  securityHeaders,
  requestTimeout
} from "./error-middleware";
import { logger } from "./logger";
import { healthMonitor } from "./health-monitor";

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security and request handling middleware
app.use(securityHeaders);
app.use(requestTimeout(30000)); // 30 second timeout

// Session middleware (must be before passport)
app.use(sessionConfig);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Enhanced request logging middleware
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
    const isError = res.statusCode >= 400;

    // Record metrics in health monitor
    healthMonitor.recordRequest(duration, isError);

    if (path.startsWith("/api")) {
      // Use our new logging system
      const userId = (req as any).user?.id;
      logger.logRequest(req.method, path, res.statusCode, duration, userId);

      // Keep the original compact logging for development
      if (isDevelopment) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse && res.statusCode >= 400) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  try {
    console.log(`🚀 Starting ${env.APP_NAME} v${env.APP_VERSION}`);

    // Validate environment and secrets
    const secretsValidation = validateSecrets();
    if (!secretsValidation.healthy) {
      console.error('❌ Environment validation failed:');
      secretsValidation.issues.forEach(issue => console.error(`  - ${issue}`));
      process.exit(1);
    }

    if (secretsValidation.warnings.length > 0) {
      console.warn('⚠️  Environment warnings:');
      secretsValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (isDevelopment) {
      console.log('🔧 Secure Configuration:');
      console.log(JSON.stringify(getSecureConfig(), null, 2));
    }

    // Register all routes
    await registerRoutes(app);

    // Use the app directly since registerRoutes modifies it in place
    const finalApp = app;

    // Get port configuration from validated environment
    const port = env.PORT;
    const host = env.HOST;

    // Create server instance
    const server = finalApp.listen(port, host, () => {
      console.log(`🌐 Server running on http://${host}:${port}`);
      if (isDevelopment) {
        console.log(`📊 Health check: http://${host}:${port}/api/health`);
        if (env.ENABLE_DOCS) {
          console.log(`📖 API docs would be available here (if implemented)`);
        }
      }
    });

    // Setup development/production serving (MUST be before error handlers!)
    if (finalApp.get("env") === "development") {
      await setupVite(finalApp, server);
    } else {
      serveStatic(finalApp);
    }

    // Error handling middleware (order matters! Must be AFTER Vite setup)
    finalApp.use(notFoundHandler);    // Handle 404s
    finalApp.use(errorLogger);        // Log errors
    finalApp.use(errorHandler);       // Handle and respond to errors

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      console.log(`🔄 Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (isProduction) {
    console.error('🔄 Shutting down due to unhandled rejection...');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('🔄 Shutting down due to uncaught exception...');
  process.exit(1);
});