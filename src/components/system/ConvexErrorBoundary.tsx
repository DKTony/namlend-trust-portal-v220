import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasForbidden: boolean;
}

/**
 * Error boundary that catches Convex FORBIDDEN errors and renders an inline
 * "Access Denied" card instead of crashing the component tree.
 *
 * Non-FORBIDDEN errors are re-thrown to the parent ErrorBoundary.
 */
class ConvexErrorBoundary extends Component<Props, State> {
  public state: State = { hasForbidden: false };

  public static getDerivedStateFromError(error: unknown): State | null {
    if (isForbiddenError(error)) {
      return { hasForbidden: true };
    }
    // Let the parent ErrorBoundary handle non-FORBIDDEN errors
    return null;
  }

  public componentDidCatch(error: Error, _info: ErrorInfo) {
    if (!isForbiddenError(error)) {
      // Re-throw so the parent ErrorBoundary handles it
      throw error;
    }
  }

  private handleGoBack = () => {
    window.history.back();
  };

  public render() {
    if (this.state.hasForbidden) {
      return (
        <div className="flex items-center justify-center py-20 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft text-center">
            <div className="mx-auto w-14 h-14 bg-amber-100  rounded-full flex items-center justify-center mb-5">
              <ShieldAlert className="w-7 h-7 text-amber-600 " />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You don't have permission to view this page. This section requires admin privileges.
            </p>
            <button
              onClick={this.handleGoBack}
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function isForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  // ConvexError stores structured data in .data
  const data = (error as Record<string, unknown>).data;
  if (data && typeof data === 'object' && (data as Record<string, unknown>).code === 'FORBIDDEN') {
    return true;
  }
  // Fallback: check message string
  const message = (error as Record<string, unknown>).message;
  if (typeof message === 'string' && message.includes('FORBIDDEN')) {
    return true;
  }
  return false;
}

export default ConvexErrorBoundary;
