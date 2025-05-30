/**
 * Production-safe logging utility
 * 
 * In development: logs to console
 * In production: logs only errors and warnings, no sensitive data
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }
  
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    
    // Remove sensitive fields
    const sanitized = { ...context };
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'cookie', 'session', 'creditCard', 'ssn', 'email'
    ];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const sanitizedContext = this.sanitizeContext(context);
    
    const logData = {
      timestamp,
      level,
      message,
      ...(sanitizedContext && { context: sanitizedContext })
    };
    
    switch (level) {
      case 'debug':
        console.debug(logData);
        break;
      case 'info':
        console.info(logData);
        break;
      case 'warn':
        console.warn(logData);
        break;
      case 'error':
        console.error(logData);
        break;
    }
  }
  
  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }
  
  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }
  
  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error && {
        errorMessage: error.message,
        errorStack: this.isDevelopment ? error.stack : undefined
      })
    };
    
    this.formatMessage('error', message, errorContext);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context);