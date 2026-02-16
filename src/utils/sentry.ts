import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initialize Sentry error tracking.
 * No-op when VITE_SENTRY_DSN is not configured.
 */
export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Report an exception to Sentry.
 * No-op when VITE_SENTRY_DSN is not configured.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });
}
