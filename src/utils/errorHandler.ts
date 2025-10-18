import { supabase } from '@/integrations/supabase/client';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

// Structured error interface
export interface AppError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
  resolved?: boolean;
}

// Error logging service
class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: AppError[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Flush errors periodically
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.flushErrorQueue();
      }
    }, 30000); // Every 30 seconds
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  // Generate UUID fallback for older browsers
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public async logError(error: Partial<AppError>): Promise<void> {
    // Sanitize context to prevent circular references
    const sanitizedContext = this.sanitizeContext(error.context);
    
    const appError: AppError = {
      id: this.generateUUID(),
      message: error.message || 'Unknown error',
      category: error.category || ErrorCategory.SYSTEM,
      severity: error.severity || ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      userId: error.userId,
      context: sanitizedContext,
      stack: this.sanitizeStack(error.stack),
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false
    };

    // Store in local queue
    this.errorQueue.push(appError);

    // Try to send immediately if online
    if (this.isOnline) {
      await this.flushErrorQueue();
    }

    // Safe console logging in development
    if (process.env.NODE_ENV === 'development') {
      this.safeConsoleError('App Error:', appError);
    }
  }

  private sanitizeContext(context: any): Record<string, any> {
    if (!context || typeof context !== 'object') {
      return {};
    }

    const sanitized: Record<string, any> = {};
    const seen = new WeakSet();

    const sanitizeValue = (key: string, value: any, depth: number = 0): any => {
      if (depth > 3) return '[Max Depth]';
      
      if (value === null || typeof value !== 'object') {
        return value;
      }

      if (seen.has(value)) {
        return '[Circular Reference]';
      }

      seen.add(value);

      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack?.split('\n').slice(0, 3).join('\n')
        };
      }

      if (value instanceof HTMLElement) {
        return `[HTMLElement: ${value.tagName}]`;
      }

      if (typeof value === 'function') {
        return '[Function]';
      }

      if (Array.isArray(value)) {
        return value.slice(0, 5).map((item, index) => 
          sanitizeValue(`${key}[${index}]`, item, depth + 1)
        );
      }

      const result: any = {};
      const keys = Object.keys(value).slice(0, 10);
      
      for (const k of keys) {
        try {
          result[k] = sanitizeValue(k, value[k], depth + 1);
        } catch (err) {
          result[k] = '[Sanitization Error]';
        }
      }

      return result;
    };

    try {
      for (const [key, value] of Object.entries(context)) {
        sanitized[key] = sanitizeValue(key, value);
      }
    } catch (err) {
      return { sanitizationError: 'Failed to sanitize context' };
    }

    return sanitized;
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    // Limit stack trace to prevent excessive data
    return stack.split('\n').slice(0, 10).join('\n');
  }

  private safeConsoleError(message: string, data: any): void {
    try {
      // Create a safe representation for console logging
      const safeData = {
        id: data.id,
        message: data.message,
        category: data.category,
        severity: data.severity,
        timestamp: data.timestamp,
        userId: data.userId,
        url: data.url,
        contextKeys: data.context ? Object.keys(data.context) : [],
        stackPreview: data.stack?.split('\n').slice(0, 2).join('\n')
      };
      
      console.error(message, safeData);
    } catch (err) {
      console.error(message, '[Error object too complex to display]');
    }
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    try {
      const errorsToSend = [...this.errorQueue];
      this.errorQueue = [];

      // Send to Supabase error_logs table
      const { error } = await supabase
        .from('error_logs')
        .insert(errorsToSend.map(err => ({
          id: err.id,
          message: err.message,
          category: err.category,
          severity: err.severity,
          timestamp: err.timestamp,
          user_id: err.userId,
          context: err.context,
          stack: err.stack,
          user_agent: err.userAgent,
          url: err.url,
          resolved: err.resolved
        })));

      if (error) {
        // If sending fails, put errors back in queue
        this.errorQueue.unshift(...errorsToSend);
        console.error('Failed to send error logs:', error);
      }
    } catch (err) {
      console.error('Error flushing error queue:', err);
    }
  }
}

// Global error handler instance
export const errorLogger = ErrorLogger.getInstance();

// Helper functions for common error scenarios
export const handleAuthError = (error: any, context?: Record<string, any>) => {
  errorLogger.logError({
    message: error.message || 'Authentication error',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    context: { ...context, originalError: error },
    stack: error.stack
  });
};

export const handleDatabaseError = (error: any, operation: string, context?: Record<string, any>) => {
  errorLogger.logError({
    message: `Database error during ${operation}: ${error.message || 'Unknown error'}`,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    context: { operation, ...context, originalError: error },
    stack: error.stack
  });
};

export const handleValidationError = (field: string, value: any, rule: string) => {
  errorLogger.logError({
    message: `Validation failed for ${field}: ${rule}`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    context: { field, value, rule }
  });
};

export const handleBusinessLogicError = (operation: string, reason: string, context?: Record<string, any>) => {
  errorLogger.logError({
    message: `Business logic error in ${operation}: ${reason}`,
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    context: { operation, reason, ...context }
  });
};

export const handleNetworkError = (url: string, method: string, error: any) => {
  errorLogger.logError({
    message: `Network error: ${method} ${url} - ${error.message || 'Unknown error'}`,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    context: { url, method, originalError: error },
    stack: error.stack
  });
};

// Error boundary helper
export const handleComponentError = (componentName: string, error: any, errorInfo: any) => {
  errorLogger.logError({
    message: `Component error in ${componentName}: ${error.message}`,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    context: { componentName, errorInfo },
    stack: error.stack
  });
};

// User action tracking for error context
export const trackUserAction = (action: string, data?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('User Action:', action, data);
  }
  
  // Store recent actions for error context
  const recentActions = JSON.parse(localStorage.getItem('recentUserActions') || '[]');
  recentActions.push({
    action,
    data,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 10 actions
  if (recentActions.length > 10) {
    recentActions.shift();
  }
  
  localStorage.setItem('recentUserActions', JSON.stringify(recentActions));
};

// Get recent user actions for error context
export const getRecentUserActions = (): any[] => {
  return JSON.parse(localStorage.getItem('recentUserActions') || '[]');
};

// Performance monitoring
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    // Log slow operations
    if (duration > 2000) { // 2 seconds threshold
      errorLogger.logError({
        message: `Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`,
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        context: { operation, duration }
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    errorLogger.logError({
      message: `Operation failed: ${operation} - ${error.message}`,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      context: { operation, duration, originalError: error },
      stack: error.stack
    });
    
    throw error;
  }
};

// Retry mechanism with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        errorLogger.logError({
          message: `Operation failed after ${maxRetries + 1} attempts: ${error.message}`,
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          context: { attempts: attempt + 1, originalError: error },
          stack: error.stack
        });
        break;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
