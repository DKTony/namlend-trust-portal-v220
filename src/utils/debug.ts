// Debug utility functions for development and troubleshooting

// Safe serialization to prevent circular reference errors
const safeStringify = (obj: any, maxDepth: number = 3): string => {
  const seen = new WeakSet();
  
  const replacer = (key: string, value: any, depth: number = 0): any => {
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }
    
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    seen.add(value);
    
    // Handle specific object types that commonly cause issues
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
      };
    }
    
    if (value instanceof HTMLElement) {
      return `[HTMLElement: ${value.tagName}]`;
    }
    
    if (typeof value === 'function') {
      return '[Function]';
    }
    
    // For objects, create a safe copy
    if (Array.isArray(value)) {
      return value.slice(0, 10).map((item, index) => 
        replacer(`[${index}]`, item, depth + 1)
      );
    }
    
    const safeObj: any = {};
    const keys = Object.keys(value).slice(0, 20); // Limit object keys
    
    for (const k of keys) {
      try {
        safeObj[k] = replacer(k, value[k], depth + 1);
      } catch (err) {
        safeObj[k] = '[Serialization Error]';
      }
    }
    
    return safeObj;
  };
  
  try {
    return JSON.stringify(replacer('', obj), null, 2);
  } catch (err) {
    return `[Serialization Failed: ${err.message}]`;
  }
};

export const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      try {
        console.log(message, safeStringify(data));
      } catch (err) {
        console.log(message, '[Data serialization failed]');
      }
    } else {
      console.log(message);
    }
  }
};

export const debugError = (message: string, error?: any) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      if (error) {
        console.error(message, safeStringify(error));
      } else {
        console.error(message);
      }
    } catch (err) {
      console.error(message, '[Error serialization failed]');
    }
  }
};

export const debugWarn = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      try {
        console.warn(message, safeStringify(data));
      } catch (err) {
        console.warn(message, '[Data serialization failed]');
      }
    } else {
      console.warn(message);
    }
  }
};
