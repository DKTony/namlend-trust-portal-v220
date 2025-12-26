/**
 * ErrorBoundary Component
 * Version: v2.7.1
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({ errorInfo });

    // In production, you would send this to an error tracking service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with Neo-Fintech styling
      return (
        <View className="flex-1 bg-zinc-950 justify-center items-center px-6">
          <StatusBar barStyle="light-content" />
          
          {/* Error Icon */}
          <View className="w-24 h-24 rounded-full bg-red-500/10 items-center justify-center mb-8 border border-red-500/20">
            <AlertTriangle size={48} color="#ef4444" />
          </View>

          {/* Error Title */}
          <Text className="text-white text-2xl font-sans-bold text-center mb-3 tracking-tight">
            Something went wrong
          </Text>

          {/* Error Description */}
          <Text className="text-zinc-400 text-base text-center mb-8 font-sans leading-6 px-4">
            We're sorry, but something unexpected happened. Please try again or restart the app.
          </Text>

          {/* Error Details (collapsible in production) */}
          {__DEV__ && this.state.error && (
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8 w-full max-h-40">
              <Text className="text-red-400 text-xs font-mono mb-2">
                {this.state.error.name}: {this.state.error.message}
              </Text>
              <ScrollView className="max-h-24">
                <Text className="text-zinc-500 text-[10px] font-mono">
                  {this.state.errorInfo?.componentStack?.slice(0, 500)}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-900/30"
            >
              <RefreshCcw size={20} color="white" />
              <Text className="text-white text-base font-sans-bold ml-2">Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // Reset the app state completely
                this.handleReset();
                // In a real app, you might navigate to home or restart
              }}
              className="bg-zinc-900 border border-zinc-800 py-4 rounded-2xl flex-row items-center justify-center"
            >
              <Home size={20} color="#a1a1aa" />
              <Text className="text-zinc-400 text-base font-sans-medium ml-2">Go to Home</Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <Text className="text-zinc-600 text-xs font-sans mt-8">
            NamLend Mobile v2.7.1
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
