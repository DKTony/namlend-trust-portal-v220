import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { handleComponentError, getRecentUserActions } from '@/utils/errorHandler';
import { captureException } from '@/utils/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Report to Sentry (no-op when DSN is absent)
    captureException(error, { componentStack: errorInfo.componentStack });

    // Log error with recent user actions for context
    const recentActions = getRecentUserActions();
    handleComponentError('ErrorBoundary', error, {
      ...errorInfo,
      recentUserActions: recentActions,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    const recentActions = getRecentUserActions();

    const errorReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      recentActions,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard
      .writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please send this to our support team.');
      })
      .catch(() => {
        console.error('Failed to copy error report');
      });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <ThemedCard className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-foreground">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                    Error Details (Development Mode)
                  </h4>
                  <pre className="text-xs text-red-700 dark:text-red-400 overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <ThemedButton onClick={this.handleRetry} className="w-full" variant="primary">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </ThemedButton>

                <ThemedButton onClick={this.handleGoHome} className="w-full" variant="secondary">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </ThemedButton>

                <ThemedButton
                  onClick={this.handleReportError}
                  className="w-full"
                  variant="ghost"
                  size="sm"
                >
                  Report Error
                </ThemedButton>
              </div>
            </CardContent>
          </ThemedCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
