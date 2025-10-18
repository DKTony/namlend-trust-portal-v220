/**
 * Development Tools Gating
 * Version: v2.6.0
 * 
 * Gates dev utilities behind EXPO_PUBLIC_DEBUG_TOOLS flag
 */

const DEBUG_TOOLS_ENABLED = process.env.EXPO_PUBLIC_DEBUG_TOOLS === 'true';

/**
 * Safely expose development utilities to global scope
 * Only enabled when EXPO_PUBLIC_DEBUG_TOOLS=true
 */
export function safeExposeDevTools(tools: Record<string, any>) {
  if (!DEBUG_TOOLS_ENABLED) {
    console.log('[DevTools] Debug tools disabled in production');
    return;
  }

  if (__DEV__) {
    const g = globalThis as any;
    Object.keys(tools).forEach((key) => {
      g[key] = tools[key];
    });
    console.log('[DevTools] Exposed:', Object.keys(tools).join(', '));
  }
}

/**
 * Check if debug tools are enabled
 */
export function isDebugEnabled(): boolean {
  return DEBUG_TOOLS_ENABLED && __DEV__;
}

/**
 * Log debug message only when debug tools enabled
 */
export function debugLog(message: string, ...args: any[]) {
  if (isDebugEnabled()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Assert debug tools are enabled before running sensitive operations
 */
export function assertDebugMode(operation: string) {
  if (!isDebugEnabled()) {
    throw new Error(`${operation} requires EXPO_PUBLIC_DEBUG_TOOLS=true`);
  }
}
