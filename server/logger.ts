import { isDevelopment } from './env-config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.logLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(entry: LogEntry): string {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const levelName = levelNames[entry.level];

    let message = `[${entry.timestamp}] ${levelName}: ${entry.message}`;

    if (entry.userId) {
      message += ` (User: ${entry.userId})`;
    }

    if (entry.requestId) {
      message += ` (Request: ${entry.requestId})`;
    }

    return message;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (error && isDevelopment) {
          console.error('Stack trace:', error.stack);
        }
        if (context && isDevelopment) {
          console.error('Context:', context);
        }
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (context && isDevelopment) {
          console.warn('Context:', context);
        }
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        if (context && isDevelopment) {
          console.info('Context:', context);
        }
        break;
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        if (context) {
          console.log('Context:', context);
        }
        break;
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Request logging helpers
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${url} ${statusCode} ${duration}ms`;

    this.log(level, message, {
      method,
      url,
      statusCode,
      duration,
      userId
    });
  }

  logApiCall(service: string, endpoint: string, success: boolean, duration: number): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `API Call: ${service} ${endpoint} ${status} ${duration}ms`;

    this.log(level, message, {
      service,
      endpoint,
      success,
      duration
    });
  }

  logDatabaseOperation(operation: string, table: string, success: boolean, duration?: number): void {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const status = success ? 'SUCCESS' : 'FAILED';
    let message = `DB ${operation} ${table} ${status}`;

    if (duration !== undefined) {
      message += ` ${duration}ms`;
    }

    this.log(level, message, {
      operation,
      table,
      success,
      duration
    });
  }

  logUserAction(userId: string, action: string, resource?: string, details?: Record<string, any>): void {
    let message = `User Action: ${action}`;
    if (resource) {
      message += ` on ${resource}`;
    }

    this.log(LogLevel.INFO, message, {
      userId,
      action,
      resource,
      ...details
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details?: Record<string, any>): void {
    const level = severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `Security Event: ${event}`, {
      severity,
      ...details
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for backward compatibility
export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  logger.error(message, error, context);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context);
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};