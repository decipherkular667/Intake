import { Response } from 'express';
import { isDevelopment } from './env-config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintain proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    if (details) {
      this.message = `${message}: ${JSON.stringify(details)}`;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(message, 500);
    this.name = 'DatabaseError';

    if (originalError && isDevelopment) {
      this.message = `${message}: ${originalError.message}`;
      this.stack = originalError.stack;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

// Async wrapper to catch errors and pass them to error handler
export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Safe JSON parse with error handling
export const safeJsonParse = (str: string, fallback: any = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to parse JSON:', str);
    return fallback;
  }
};

// Database operation wrapper with error handling
export const withDbErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database error: ${errorMessage}`, error);
    throw new DatabaseError(errorMessage, error as Error);
  }
};

// Validation helper
export const validateRequired = (fields: Record<string, any>, requiredFields: string[]) => {
  const missing = requiredFields.filter(field =>
    fields[field] === undefined ||
    fields[field] === null ||
    fields[field] === ''
  );

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

// Response helpers
export const sendSuccess = (res: Response, data: any, message?: string, statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res: Response, error: string | Error, statusCode: number = 500) => {
  const message = error instanceof Error ? error.message : error;
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && error instanceof Error && { stack: error.stack })
  });
};

// Log error with context
export const logError = (error: Error, context?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${error.name}: ${error.message}`);

  if (context) {
    console.error('Context:', context);
  }

  if (isDevelopment && error.stack) {
    console.error('Stack:', error.stack);
  }
};