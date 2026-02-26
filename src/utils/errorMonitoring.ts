// Error Monitoring and Alerting System
// Prevents critical system failures by detecting and reporting issues early

import { captureException } from '@/utils/sentry';

export interface SystemError {
  id: string;
  message: string;
  category: 'database' | 'authentication' | 'performance' | 'rpc' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  url?: string;
  userId?: string;
  contextKeys: string[];
  metadata?: Record<string, unknown>;
}

class ErrorMonitor {
  private errors: SystemError[] = [];
  private readonly maxErrors = 100;

  // Generate UUID fallback for older browsers
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Log system errors with categorization
  logError(error: Partial<SystemError>): void {
    const systemError: SystemError = {
      id: this.generateUUID(),
      message: error.message || 'Unknown error',
      category: error.category || 'system',
      severity: error.severity || 'medium',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      contextKeys: error.contextKeys || [],
      metadata: error.metadata || {},
      ...error,
    };

    this.errors.unshift(systemError);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Console logging with severity indicators
    const prefix =
      systemError.severity === 'critical'
        ? '🚨'
        : systemError.severity === 'high'
          ? '⚠️'
          : systemError.severity === 'medium'
            ? '📋'
            : 'ℹ️';

    console.error(
      `${prefix} [${systemError.category.toUpperCase()}] ${systemError.message}`,
      systemError
    );

    // Handle critical errors
    if (systemError.severity === 'critical') {
      this.handleCriticalError(systemError);
    }

    this.persistErrors();
  }

  // Monitor RPC calls for failures and performance
  monitorRpcCall(procedure: string, duration: number, success: boolean): void {
    if (!success) {
      this.logError({
        message: `RPC call failed: ${procedure}`,
        category: 'rpc',
        severity: 'high',
        contextKeys: ['rpc_failure', procedure],
        metadata: { procedure, duration, success },
      });
    }

    if (duration > 2000) {
      this.logError({
        message: `Slow RPC detected: ${procedure} took ${duration.toFixed(1)}ms`,
        category: 'performance',
        severity: duration > 5000 ? 'critical' : 'medium',
        contextKeys: ['slow_operation', procedure],
        metadata: { procedure, duration },
      });
    }
  }

  // Monitor database errors
  monitorDatabaseError(operation: string, error: { code?: string; message?: string }): void {
    let severity: SystemError['severity'] = 'medium';
    let message = `Database error in ${operation}`;

    if (error.code === 'PGRST116') {
      severity = 'critical';
      message = 'Multiple rows returned when expecting single row';
    } else if (error.code === 'PGRST205' || error.code === '42P01') {
      severity = 'critical';
      message = `Missing table or relation: ${error.message}`;
    } else if (error.code === 'PGRST204') {
      severity = 'high';
      message = `Schema cache error - column not found: ${error.message}`;
    } else if (operation === 'update_profile') {
      severity = 'high';
      message = `Profile update failed: ${error.message}`;
    }

    this.logError({
      message,
      category: 'database',
      severity,
      contextKeys: ['database_error', operation, error.code].filter(Boolean),
      metadata: { operation, errorCode: error.code, errorMessage: error.message },
    });
  }

  // Throttle map: errorType -> last alert timestamp
  private alertThrottle = new Map<string, number>();
  private static ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Handle critical errors with admin alerting
  private handleCriticalError(error: SystemError): void {
    // Report to Sentry (no-op when DSN is absent)
    captureException(new Error(error.message), {
      category: error.category,
      severity: error.severity,
      contextKeys: error.contextKeys,
      metadata: error.metadata,
    });

    if (
      error.category === 'database' &&
      error.message.includes('document_verification_requirements')
    ) {
      console.error(
        '🚨 CRITICAL: KYC system is down - document_verification_requirements table missing'
      );
    }

    // Throttle: max 1 alert per error type per 5 minutes
    const throttleKey = `${error.category}:${error.message.slice(0, 100)}`;
    const now = Date.now();
    const lastAlert = this.alertThrottle.get(throttleKey);
    if (lastAlert && now - lastAlert < ErrorMonitor.ALERT_COOLDOWN_MS) {
      return;
    }
    this.alertThrottle.set(throttleKey, now);

    // Notify admin users asynchronously — failures must never worsen the error
    this.notifyAdmins(error).catch(() => {
      // Swallow alerting failures silently
    });
  }

  private async notifyAdmins(error: SystemError): Promise<void> {
    // Admin alerting via Convex notifications — log to console for now
    // (Supabase notificationService removed; wire api.notifications.queueNotification when needed)
    console.warn(
      `[ErrorMonitor] Admin alert suppressed (notification service migrated): ${error.category} — ${error.message}`
    );
  }

  // Persist errors to localStorage
  private persistErrors(): void {
    try {
      localStorage.setItem('namlend_system_errors', JSON.stringify(this.errors.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to persist errors:', e);
    }
  }

  // Get system health status
  getSystemHealth(): { status: 'healthy' | 'degraded' | 'critical'; issues: string[] } {
    const criticalErrors = this.errors.filter((e) => e.severity === 'critical').length;
    const highErrors = this.errors.filter((e) => e.severity === 'high').length;

    if (criticalErrors > 0) {
      return {
        status: 'critical',
        issues: [`${criticalErrors} critical errors detected`],
      };
    }

    if (highErrors > 5) {
      return {
        status: 'degraded',
        issues: [`${highErrors} high-priority errors detected`],
      };
    }

    return { status: 'healthy', issues: [] };
  }
}

// Global error monitor instance
export const errorMonitor = new ErrorMonitor();

// Integrate with RPC wrapper
export const monitorRpcCall = (procedure: string, duration: number, success: boolean) => {
  errorMonitor.monitorRpcCall(procedure, duration, success);
};

// Integrate with database operations
export const monitorDatabaseError = (
  operation: string,
  error: { code?: string; message?: string }
) => {
  errorMonitor.monitorDatabaseError(operation, error);
};

// Global error handler
window.addEventListener('error', (event) => {
  errorMonitor.logError({
    message: event.message,
    category: 'system',
    severity: 'medium',
    contextKeys: ['javascript_error'],
    metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorMonitor.logError({
    message: `Unhandled promise rejection: ${event.reason}`,
    category: 'system',
    severity: 'high',
    contextKeys: ['promise_rejection'],
    metadata: { reason: event.reason },
  });
});
