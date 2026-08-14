/**
 * HTTP-based tools for fetching and posting data to URLs
 * Includes safety checks like URL validation, timeouts, and response size limits
 */

import { RegisteredTool, ToolExecutionContext } from './types';

/**
 * URL whitelist/blacklist for security
 * Can be configured per deployment
 */
const DEFAULT_URL_WHITELIST: RegExp[] = [
  /^https:\/\//i, // Only HTTPS
];

const DEFAULT_URL_BLACKLIST: RegExp[] = [
  /localhost/i,
  /127\.0\.0\.1/i,
  /192\.168\./i,
  /10\./i,
  /172\.(1[6-9]|2[0-9]|3[01])\./i, // Private IP ranges
  /169\.254\./i, // Link-local
];

/**
 * Validate URL for security
 * @param url - The URL to validate
 * @returns True if URL is safe to fetch
 */
function isUrlSafe(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check whitelist
    const isWhitelisted = DEFAULT_URL_WHITELIST.some((pattern) => pattern.test(url));
    if (!isWhitelisted) {
      return false;
    }

    // Check blacklist
    const isBlacklisted = DEFAULT_URL_BLACKLIST.some((pattern) => pattern.test(url));
    if (isBlacklisted) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Parse content type from response headers
 * @param contentType - The Content-Type header value
 * @returns Parsed content type and charset
 */
function parseContentType(contentType: string | null): { type: string; charset: string } {
  if (!contentType) {
    return { type: 'text/plain', charset: 'utf-8' };
  }

  const [type, ...params] = contentType.split(';');
  const charset = params.find((p) => p.trim().startsWith('charset='))?.split('=')[1]?.trim() || 'utf-8';

  return { type: type.trim(), charset };
}

/**
 * HTTP GET tool
 * Fetches data from a URL with timeout and size limits
 */
export const httpGetTool: RegisteredTool = {
  name: 'http_get',
  description: 'Fetch data from a URL using HTTP GET request',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch from (must be HTTPS)',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers to send',
        additionalProperties: true,
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000, max: 120000)',
      },
    },
    required: ['url'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const url = args.url as string;
    const headers = (args.headers as Record<string, string>) || {};
    let timeout = (args.timeout as number) || 30000;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'Invalid URL: must be a non-empty string' };
    }

    if (!isUrlSafe(url)) {
      return { success: false, error: 'URL not allowed: check security policy' };
    }

    // Validate timeout
    timeout = Math.min(timeout, 120000);
    if (timeout < 1000) {
      timeout = 1000;
    }

    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        return { success: false, error: 'Response too large (max 1MB)' };
      }

      const contentType = parseContentType(response.headers.get('content-type'));
      const text = await response.text();

      // Check actual size
      if (new Blob([text]).size > 1024 * 1024) {
        return { success: false, error: 'Response too large (max 1MB)' };
      }

      return {
        success: true,
        result: {
          status: response.status,
          contentType: contentType.type,
          body: text,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  requiresPermission: true,
};

/**
 * HTTP POST tool
 * Posts data to a URL with timeout and size limits
 */
export const httpPostTool: RegisteredTool = {
  name: 'http_post',
  description: 'Send data to a URL using HTTP POST request',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to post to (must be HTTPS)',
      },
      body: {
        description: 'The request body (string or object)',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers to send',
        additionalProperties: true,
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000, max: 120000)',
      },
    },
    required: ['url', 'body'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const url = args.url as string;
    const body = args.body;
    const headers = (args.headers as Record<string, string>) || {};
    let timeout = (args.timeout as number) || 30000;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'Invalid URL: must be a non-empty string' };
    }

    if (!isUrlSafe(url)) {
      return { success: false, error: 'URL not allowed: check security policy' };
    }

    // Validate timeout
    timeout = Math.min(timeout, 120000);
    if (timeout < 1000) {
      timeout = 1000;
    }

    try {
      // Prepare body
      let bodyStr: string;
      if (typeof body === 'string') {
        bodyStr = body;
      } else if (typeof body === 'object') {
        bodyStr = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        return { success: false, error: 'Invalid body: must be string or object' };
      }

      // Check body size
      if (new Blob([bodyStr]).size > 1024 * 1024) {
        return { success: false, error: 'Request body too large (max 1MB)' };
      }

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = parseContentType(response.headers.get('content-type'));
      const text = await response.text();

      // Check response size
      if (new Blob([text]).size > 1024 * 1024) {
        return { success: false, error: 'Response too large (max 1MB)' };
      }

      return {
        success: true,
        result: {
          status: response.status,
          contentType: contentType.type,
          body: text,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  requiresPermission: true,
};

/**
 * Register HTTP tools
 */
export async function registerHttpTools(): Promise<void> {
  try {
    const { registerTool } = await import('./registry');
    registerTool(httpGetTool);
    registerTool(httpPostTool);
  } catch (error) {
    console.error('Failed to register HTTP tools:', error);
  }
}
