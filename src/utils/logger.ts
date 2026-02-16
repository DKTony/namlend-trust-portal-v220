/**
 * Structured Logging Utility
 *
 * Provides levelled, structured logging for the NamLend platform.
 * - Dev: Pretty-printed via console methods
 * - Production: JSON-line format for log aggregation
 * - Level filtering: debug is suppressed in production
 * - Bridges critical/error to errorMonitor for existing alerting pipeline
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('Loan approved', { loanId, amount });
 *   logger.error('Payment failed', { error: err.message });
 *
 * For domain-specific child loggers:
 *   const log = logger.child('payments');
 *   log.warn('Retry exhausted', { paymentId });
 */

import { errorMonitor } from './errorMonitoring';

// ── Types ───────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

// ── Level ordering for filtering ────────────────────────────────────

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

// ── Logger class ────────────────────────────────────────────────────

export class Logger {
  private context?: string;
  private minLevel: LogLevel;

  constructor(context?: string) {
    this.context = context;
    // Suppress debug in production
    this.minLevel = import.meta.env.DEV ? 'debug' : 'info';
  }

  /**
   * Create a child logger with a specific context prefix.
   */
  child(context: string): Logger {
    return new Logger(this.context ? `${this.context}.${context}` : context);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);

    // Bridge to existing error monitoring pipeline
    errorMonitor.logError({
      message: this.context ? `[${this.context}] ${message}` : message,
      category: 'system',
      severity: 'high',
      contextKeys: this.context ? [this.context] : [],
      metadata: data,
    });
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(this.context && { context: this.context }),
      ...(data && { data }),
    };

    if (import.meta.env.DEV) {
      // Pretty-print in development
      const prefix = this.context ? `[${this.context}]` : '';
      const method = CONSOLE_METHOD[level];
      if (data) {
        console[method](`${prefix} ${message}`, data);
      } else {
        console[method](`${prefix} ${message}`);
      }
    } else {
      // JSON-line format for production log aggregation
      console[CONSOLE_METHOD[level]](JSON.stringify(entry));
    }
  }
}

// ── Singleton export ────────────────────────────────────────────────

export const logger = new Logger();
