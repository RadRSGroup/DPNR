import fs from 'fs';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file?: {
    enabled: boolean;
    path: string;
    maxSize: number; // in bytes
    maxFiles: number;
  };
  sentry?: {
    enabled: boolean;
    dsn: string;
    environment: string;
  };
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      level: this.getLogLevel(),
      console: true,
      file: {
        enabled: process.env.NODE_ENV === 'production',
        path: process.env.LOG_FILE || 'logs/app.log',
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '20971520'), // 20MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '30'),
      },
      sentry: {
        enabled: !!process.env.SENTRY_DSN,
        dsn: process.env.SENTRY_DSN || '',
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      },
    };

    if (this.config.file?.enabled) {
      this.ensureLogDirectory();
      this.startFlushInterval();
    }

    this.initSentry();
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogDirectory() {
    if (!this.config.file?.path) return;
    
    const logDir = path.dirname(this.config.file.path);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private startFlushInterval() {
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000);
  }

  private flushLogs() {
    if (this.logBuffer.length === 0 || !this.config.file?.enabled) return;

    const logData = this.logBuffer.join('\n') + '\n';
    this.logBuffer = [];

    try {
      // Rotate logs if needed
      this.rotateLogs();
      
      // Append to log file
      fs.appendFileSync(this.config.file.path, logData, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private rotateLogs() {
    if (!this.config.file?.path) return;

    try {
      const stats = fs.statSync(this.config.file.path);
      if (stats.size > this.config.file.maxSize) {
        // Move current log to backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${this.config.file.path}.${timestamp}`;
        fs.renameSync(this.config.file.path, backupPath);

        // Clean up old log files
        this.cleanOldLogs();
      }
    } catch (error) {
      // Log file doesn't exist yet, which is fine
    }
  }

  private cleanOldLogs() {
    if (!this.config.file?.path) return;

    try {
      const logDir = path.dirname(this.config.file.path);
      const logBasename = path.basename(this.config.file.path);
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(logBasename) && file !== logBasename)
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove excess log files
      files.slice(this.config.file.maxFiles).forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  private initSentry() {
    if (!this.config.sentry?.enabled) return;

    try {
      // Initialize Sentry if available
      const Sentry = require('@sentry/node');
      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: this.config.sentry.environment,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
    } catch (error) {
      console.warn('Sentry initialization failed:', error.message);
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private log(level: LogLevel, levelStr: string, message: string, meta?: any) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelStr, message, meta);

    // Console output
    if (this.config.console) {
      const logFn = level === LogLevel.ERROR ? console.error : 
                   level === LogLevel.WARN ? console.warn : console.log;
      logFn(formattedMessage);
    }

    // File output
    if (this.config.file?.enabled) {
      this.logBuffer.push(formattedMessage);
    }

    // Sentry for errors
    if (level === LogLevel.ERROR && this.config.sentry?.enabled) {
      try {
        const Sentry = require('@sentry/node');
        if (meta instanceof Error) {
          Sentry.captureException(meta);
        } else {
          Sentry.captureMessage(message, 'error');
        }
      } catch (error) {
        // Sentry not available
      }
    }
  }

  error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, 'error', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, 'warn', message, meta);
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, 'info', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, 'debug', message, meta);
  }

  // Structured logging methods
  logRequest(req: any) {
    const requestInfo = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };
    this.info('Request received', requestInfo);
  }

  logResponse(req: any, res: any, duration: number) {
    const responseInfo = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };
    this.info('Request completed', responseInfo);
  }

  logError(error: Error, context?: any) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };
    this.error('Application error', errorInfo);
  }

  logSecurityEvent(event: string, details: any) {
    const securityInfo = {
      event,
      details,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };
    this.warn(`Security event: ${event}`, securityInfo);
  }

  logPerformance(operation: string, duration: number, details?: any) {
    const perfInfo = {
      operation,
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString(),
    };
    this.info('Performance metric', perfInfo);
  }

  // Cleanup method
  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs(); // Final flush
  }
}

// Create singleton instance
const logger = new Logger();

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  logger.logRequest(req);

  // Log response when request completes
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
    return originalSend.call(this, body);
  };

  next();
};

// Graceful shutdown handler
process.on('SIGTERM', () => logger.shutdown());
process.on('SIGINT', () => logger.shutdown());

export default logger;