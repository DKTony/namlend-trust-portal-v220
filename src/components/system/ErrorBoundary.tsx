import { getRecentUserActions, handleComponentError } from '@/utils/errorHandler';
import { captureException } from '@/utils/sentry';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

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
      componentStack: errorInfo.componentStack ?? undefined,
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

      // Default error UI — uses only plain HTML + Tailwind CSS variables.
      // MUST NOT call any React context hooks because
      // this fallback renders OUTSIDE all providers.
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100  rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-muted-foreground text-center">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50  border border-red-200  rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800  mb-2">
                    Error Details (Development Mode)
                  </h4>
                  <pre className="text-xs text-red-700  overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex items-center justify-center h-10 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full inline-flex items-center justify-center h-10 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>

                <button
                  onClick={this.handleReportError}
                  className="w-full inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Report Error
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
