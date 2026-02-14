/**
 * Standardized API Response Handlers
 * Ensures consistent response format across all endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

/**
 * Success response
 */
export function success<T>(data: T, meta?: ApiResponse['meta']): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Created response (201)
 */
export function created<T>(data: T): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * No content response (204)
 */
export function noContent(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Bad request response (400)
 */
export function badRequest(error: string): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Unauthorized response (401)
 */
export function unauthorized(error = 'Authentication required'): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Forbidden response (403)
 */
export function forbidden(error = 'Access denied'): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Not found response (404)
 */
export function notFound(error = 'Resource not found'): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Conflict response (409)
 */
export function conflict(error: string): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 409,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Unprocessable entity response (422)
 */
export function unprocessable(error: string): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 422,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Internal server error response (500)
 */
export function serverError(error = 'Internal server error'): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(body), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * CORS preflight response
 */
export function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Method not allowed response (405)
 */
export function methodNotAllowed(allowed: string[]): Response {
  const body: ApiResponse = {
    success: false,
    error: `Method not allowed. Allowed: ${allowed.join(', ')}`,
  };

  return new Response(JSON.stringify(body), {
    status: 405,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Allow': allowed.join(', '),
    },
  });
}

/**
 * Rate limited response (429)
 */
export function rateLimited(retryAfter = 60): Response {
  const body: ApiResponse = {
    success: false,
    error: 'Too many requests. Please try again later.',
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  });
}
