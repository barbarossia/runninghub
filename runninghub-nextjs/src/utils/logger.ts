import { toast } from 'sonner';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';
export type LogSource = 'ui' | 'api' | 'cli';

interface LoggerOptions {
  toast?: boolean; // Show toast notification (default: true for info/success/warning/error, false for debug)
  metadata?: Record<string, any>;
  taskId?: string;
}

class Logger {
  private async sendToApi(level: LogLevel, message: string, options: LoggerOptions = {}) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          source: 'ui' as LogSource,
          message,
          taskId: options.taskId,
          metadata: options.metadata,
        }),
      });
    } catch (error) {
      // Silent fail - don't let logging errors break the app
      console.error('Failed to send log to API:', error);
    }
  }

  info(message: string, options?: LoggerOptions) {
    console.log(`[INFO] ${message}`, options?.metadata || '');
    if (options?.toast !== false) toast.info(message);
    this.sendToApi('info', message, options);
  }

  success(message: string, options?: LoggerOptions) {
    console.log(`[SUCCESS] ${message}`, options?.metadata || '');
    if (options?.toast !== false) toast.success(message);
    this.sendToApi('success', message, options);
  }

  warning(message: string, options?: LoggerOptions) {
    console.warn(`[WARNING] ${message}`, options?.metadata || '');
    if (options?.toast !== false) toast.warning(message);
    this.sendToApi('warning', message, options);
  }

  error(message: string, options?: LoggerOptions) {
    console.error(`[ERROR] ${message}`, options?.metadata || '');
    if (options?.toast !== false) toast.error(message);
    this.sendToApi('error', message, options);
  }

  debug(message: string, options?: LoggerOptions) {
    console.log(`[DEBUG] ${message}`, options?.metadata || '');
    // No toast for debug by default
    if (options?.toast) toast.info(message);
    this.sendToApi('debug', message, options);
  }
}

export const logger = new Logger();

// Convenience exports
export const logInfo = (message: string, options?: LoggerOptions) => logger.info(message, options);
export const logSuccess = (message: string, options?: LoggerOptions) => logger.success(message, options);
export const logWarning = (message: string, options?: LoggerOptions) => logger.warning(message, options);
export const logError = (message: string, options?: LoggerOptions) => logger.error(message, options);
export const logDebug = (message: string, options?: LoggerOptions) => logger.debug(message, options);
