import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  errorLogger, 
  ErrorCategory, 
  ErrorSeverity,
  handleAuthError,
  handleDatabaseError,
  handleValidationError,
  handleBusinessLogicError,
  handleNetworkError,
  trackUserAction,
  measurePerformance,
  retryWithBackoff
} from '@/utils/errorHandler';

interface UseErrorHandlerReturn {
  handleError: (error: any, context?: Record<string, any>) => void;
  handleAsyncOperation: <T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      showSuccessToast?: boolean;
      successMessage?: string;
      showErrorToast?: boolean;
      retries?: number;
    }
  ) => Promise<T | null>;
  trackAction: (action: string, data?: Record<string, any>) => void;
  showErrorToast: (message: string, title?: string) => void;
  showSuccessToast: (message: string, title?: string) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const { toast } = useToast();

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    // Determine error category and severity based on error type
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;

    if (error?.message?.includes('auth') || error?.code === 'PGRST301') {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
    } else if (error?.message?.includes('permission') || error?.code === 'PGRST116') {
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.HIGH;
    } else if (error?.message?.includes('database') || error?.code?.startsWith('PGRST')) {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.HIGH;
    } else if (error?.message?.includes('network') || error?.name === 'NetworkError') {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.MEDIUM;
    } else if (error?.message?.includes('validation')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    }

    errorLogger.logError({
      message: error?.message || 'Unknown error occurred',
      category,
      severity,
      context: {
        ...context,
        originalError: error,
        errorCode: error?.code,
        errorName: error?.name
      },
      stack: error?.stack
    });
  }, []);

  const showErrorToast = useCallback((message: string, title?: string) => {
    toast({
      title: title || 'Error',
      description: message,
      variant: 'destructive'
    });
  }, [toast]);

  const showSuccessToast = useCallback((message: string, title?: string) => {
    toast({
      title: title || 'Success',
      description: message,
      variant: 'default'
    });
  }, [toast]);

  const trackAction = useCallback((action: string, data?: Record<string, any>) => {
    trackUserAction(action, data);
  }, []);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      showSuccessToast?: boolean;
      successMessage?: string;
      showErrorToast?: boolean;
      retries?: number;
    } = {}
  ): Promise<T | null> => {
    const {
      showSuccessToast: showSuccess = false,
      successMessage = 'Operation completed successfully',
      showErrorToast: showError = true,
      retries = 0
    } = options;

    try {
      trackAction(`start_${operationName}`);

      const result = await measurePerformance(operationName, async () => {
        if (retries > 0) {
          return await retryWithBackoff(operation, retries);
        } else {
          return await operation();
        }
      });

      trackAction(`complete_${operationName}`, { success: true });

      if (showSuccess) {
        showSuccessToast(successMessage);
      }

      return result;
    } catch (error: any) {
      trackAction(`error_${operationName}`, { error: error?.message });
      
      handleError(error, { 
        operation: operationName,
        retries,
        timestamp: new Date().toISOString()
      });

      if (showError) {
        const userFriendlyMessage = getUserFriendlyErrorMessage(error, operationName);
        showErrorToast(userFriendlyMessage);
      }

      return null;
    }
  }, [handleError, showErrorToast, showSuccessToast, trackAction]);

  return {
    handleError,
    handleAsyncOperation,
    trackAction,
    showErrorToast,
    showSuccessToast
  };
};

// Helper function to convert technical errors to user-friendly messages
const getUserFriendlyErrorMessage = (error: any, operation: string): string => {
  // Authentication errors
  if (error?.message?.includes('auth') || error?.code === 'PGRST301') {
    return 'Please sign in again to continue.';
  }

  // Permission errors
  if (error?.message?.includes('permission') || error?.code === 'PGRST116') {
    return 'You do not have permission to perform this action.';
  }

  // Network errors
  if (error?.message?.includes('network') || error?.name === 'NetworkError') {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  // Database errors
  if (error?.message?.includes('database') || error?.code?.startsWith('PGRST')) {
    return 'A database error occurred. Please try again in a moment.';
  }

  // Validation errors
  if (error?.message?.includes('validation')) {
    return 'Please check your input and try again.';
  }

  // Loan-specific errors
  if (operation.includes('loan')) {
    if (error?.message?.includes('amount')) {
      return 'Invalid loan amount. Please check the amount and try again.';
    }
    if (error?.message?.includes('eligibility')) {
      return 'You are not eligible for this loan. Please contact support for more information.';
    }
    return 'An error occurred while processing your loan request. Please try again.';
  }

  // Payment-specific errors
  if (operation.includes('payment')) {
    if (error?.message?.includes('insufficient')) {
      return 'Insufficient funds. Please check your account balance.';
    }
    return 'Payment processing failed. Please try again or contact support.';
  }

  // User management errors
  if (operation.includes('user')) {
    return 'User operation failed. Please try again or contact support.';
  }

  // Generic fallback
  return `An error occurred while ${operation.replace(/_/g, ' ')}. Please try again.`;
};
