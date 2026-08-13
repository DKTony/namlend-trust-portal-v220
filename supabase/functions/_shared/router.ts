/**
 * Simple Router for Edge Functions
 * Handles path-based routing within a single edge function
 */

import { cors, methodNotAllowed, notFound } from './responses.ts';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RouteHandler = (
  req: Request,
  params: Record<string, string>
) => Promise<Response> | Response;

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];
  private basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  /**
   * Convert path pattern to regex
   * Supports :param style parameters
   */
  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parameter = /\/:([^/]+)/g;
    let cursor = 0;
    let regexPattern = '';
    for (const match of path.matchAll(parameter)) {
      const index = match.index ?? 0;
      regexPattern += escapeRegex(path.slice(cursor, index));
      regexPattern += '/([^/]+)';
      paramNames.push(match[1]);
      cursor = index + match[0].length;
    }
    regexPattern += escapeRegex(path.slice(cursor));

    return {
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames,
    };
  }

  /**
   * Register a route
   */
  private addRoute(method: HttpMethod, path: string, handler: RouteHandler): void {
    const fullPath = this.basePath + path;
    const { pattern, paramNames } = this.pathToRegex(fullPath);

    this.routes.push({
      method,
      pattern,
      paramNames,
      handler,
    });
  }

  /**
   * GET route
   */
  get(path: string, handler: RouteHandler): Router {
    this.addRoute('GET', path, handler);
    return this;
  }

  /**
   * POST route
   */
  post(path: string, handler: RouteHandler): Router {
    this.addRoute('POST', path, handler);
    return this;
  }

  /**
   * PUT route
   */
  put(path: string, handler: RouteHandler): Router {
    this.addRoute('PUT', path, handler);
    return this;
  }

  /**
   * PATCH route
   */
  patch(path: string, handler: RouteHandler): Router {
    this.addRoute('PATCH', path, handler);
    return this;
  }

  /**
   * DELETE route
   */
  delete(path: string, handler: RouteHandler): Router {
    this.addRoute('DELETE', path, handler);
    return this;
  }

  /**
   * Handle incoming request
   */
  async handle(req: Request): Promise<Response> {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return cors();
    }

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method as HttpMethod;

    // Find matching routes for this path
    const matchingRoutes = this.routes.filter((route) => route.pattern.test(path));

    if (matchingRoutes.length === 0) {
      return notFound(`Endpoint not found: ${path}`);
    }

    // Find route with matching method
    const route = matchingRoutes.find((r) => r.method === method);

    if (!route) {
      const allowedMethods = matchingRoutes.map((r) => r.method);
      return methodNotAllowed(allowedMethods);
    }

    // Extract params
    const match = path.match(route.pattern);
    const params: Record<string, string> = {};

    if (match) {
      route.paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
    }

    // Execute handler
    return route.handler(req, params);
  }
}

/**
 * Create a new router instance
 */
export function createRouter(basePath: string = ''): Router {
  return new Router(basePath);
}
