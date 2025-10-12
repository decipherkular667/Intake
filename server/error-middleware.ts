import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  asyncHandler,
  logError
} from './error-utils';
import { isDevelopment } from './env-config';

// Validation middleware using Zod schemas
export const validateSchema = (schema: any, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Validation failed',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).received
          }))
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

// Partial validation middleware for update operations
export const validatePartialSchema = (schema: any, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = schema.partial().parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Validation failed',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).received
          }))
        );
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

// Simple query parameter validation for basic routes
export const validateQueryParams = (requiredParams: string[] = [], optionalParams: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;

      // Check required parameters
      for (const param of requiredParams) {
        if (!query[param] || (typeof query[param] === 'string' && query[param].trim() === '')) {
          throw new ValidationError(`Required query parameter '${param}' is missing or empty`);
        }
      }

      // Validate that only allowed parameters are present
      const allowedParams = [...requiredParams, ...optionalParams];
      const providedParams = Object.keys(query);
      const invalidParams = providedParams.filter(param => !allowedParams.includes(param));

      if (invalidParams.length > 0) {
        throw new ValidationError(`Invalid query parameters: ${invalidParams.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to handle async route handlers
export const wrapAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return asyncHandler(fn);
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Enhanced error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const context = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req.user as any)?.id,
    timestamp: new Date().toISOString(),
    body: isDevelopment ? req.body : undefined,
    query: isDevelopment ? req.query : undefined,
    params: isDevelopment ? req.params : undefined
  };

  logError(error, context);
  next(error);
};

// Main error handler
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'DatabaseError') {
    statusCode = 500;
    message = 'Database operation failed';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(isDevelopment && {
      stack: error.stack,
      originalError: error.message
    })
  };

  res.status(statusCode).json(errorResponse);
};

// Health check with error handling
export const healthCheck = wrapAsync(async (req: Request, res: Response) => {
  try {
    // You can add database connectivity checks here
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV
    };

    res.status(200).json(health);
  } catch (error) {
    throw new AppError('Health check failed', 503);
  }
});

// Rate limiting error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.round((req as any).rateLimit?.resetTime || Date.now() / 1000) + 60
  });
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};