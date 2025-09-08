/**
 * Shared logging utility for all FIR packages
 * Supports different log levels and configurable output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  enableColors?: boolean;
}

class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableColors: boolean;
  private readonly levels = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(options: LoggerOptions = { level: 'info' }) {
    this.level = options.level;
    this.prefix = options.prefix || '';
    this.enableColors = options.enableColors ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 19);
    const levelStr = level.toUpperCase().padEnd(5);
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    
    if (this.enableColors) {
      const colors = {
        debug: '\x1b[36m',  // cyan
        info: '\x1b[32m',   // green  
        warn: '\x1b[33m',   // yellow
        error: '\x1b[31m'   // red
      };
      const reset = '\x1b[0m';
      return `${colors[level]}${timestamp} ${levelStr}${reset} ${prefix}${message}`;
    }
    
    return `${timestamp} ${levelStr} ${prefix}${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  // Convenience methods for common FIR patterns
  success(message: string, ...args: any[]) {
    if (this.enableColors) {
      console.log(`\x1b[32m✅ ${message}\x1b[0m`, ...args);
    } else {
      console.log(`✅ ${message}`, ...args);
    }
  }

  progress(message: string, ...args: any[]) {
    if (this.enableColors) {
      console.log(`\x1b[36m🔄 ${message}\x1b[0m`, ...args);  
    } else {
      console.log(`🔄 ${message}`, ...args);
    }
  }

  cost(message: string, ...args: any[]) {
    if (this.enableColors) {
      console.log(`\x1b[33m💰 ${message}\x1b[0m`, ...args);
    } else {
      console.log(`💰 ${message}`, ...args);
    }
  }
}

// Create default logger instances
export const logger = new Logger({
  level: process.env.DEBUG === 'true' ? 'debug' : 'info',
  enableColors: process.stdout.isTTY
});

// Create specialized loggers for different components
export const createLogger = (prefix: string, level?: LogLevel) => 
  new Logger({ 
    level: level || (process.env.DEBUG === 'true' ? 'debug' : 'info'),
    prefix,
    enableColors: process.stdout.isTTY
  });

export default logger;