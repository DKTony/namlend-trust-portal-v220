/**
 * Secure helper for exposing development utilities to window object
 * Only exposes utilities when explicitly enabled via VITE_DEBUG_TOOLS
 * Prevents accidental production exposure and enables tree-shaking
 */

/**
 * Safely expose a development utility to the window object
 * Only works in development with VITE_DEBUG_TOOLS=true
 * @param name - Property name to attach to window
 * @param value - Value to expose
 * @param logMessage - Optional custom log message
 */
export const safeExposeWindow = (name: string, value: any, logMessage?: string) => {
  // Triple gate: DEV environment + explicit debug flag + window exists
  if (
    import.meta.env.DEV && 
    import.meta.env.VITE_DEBUG_TOOLS === 'true' && 
    typeof window !== 'undefined'
  ) {
    // @ts-ignore - Intentionally adding to window for debugging
    window[name] = value;
    
    if (logMessage) {
      console.log(logMessage);
    } else {
      console.log(`🔧 Debug utility available at: window.${name}`);
    }
  }
};

/**
 * Check if debug tools are enabled
 * Useful for conditional dev utility initialization
 */
export const isDebugEnabled = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_DEBUG_TOOLS === 'true';
};

/**
 * Safe console logging for dev utilities
 * Only logs when debug tools are enabled
 */
export const debugLog = (message: string, ...args: any[]) => {
  if (isDebugEnabled()) {
    console.log(message, ...args);
  }
};
