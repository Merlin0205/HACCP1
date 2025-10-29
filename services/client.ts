/**
 * API Client - Centrální wrapper pro všechna fetch volání
 * 
 * Features:
 * - Automatický retry při chybách
 * - Centrální error handling
 * - Timeout management
 * - Request/Response interceptory
 */

export interface ApiRequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Základní fetch wrapper s timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, error);
    }
    throw error;
  }
}

/**
 * Sleep utility pro retry delay
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hlavní API client s retry logikou
 */
export async function apiRequest<T>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchOptions
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      // Pokud je to 5xx chyba, zkusíme retry
      if (response.status >= 500 && attempt < retries) {
        lastError = new ApiError(
          `Server error: ${response.status}`,
          response.status
        );
        await sleep(retryDelay * (attempt + 1));
        continue;
      }

      // Pokud není OK a už nemáme pokusy, throwni error
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ApiError(
          `HTTP ${response.status}: ${errorText}`,
          response.status
        );
      }

      // Úspěšná odpověď
      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      // Network error - zkusíme retry
      if (attempt < retries && !(error instanceof ApiError)) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }

      // ApiError s non-5xx statusem - nehazíme retry
      if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      // Poslední pokus, throwni error
      if (attempt === retries) {
        throw error instanceof ApiError
          ? error
          : new ApiError('Network error', undefined, error as Error);
      }
    }
  }

  // Fallback (měl by být unreachable)
  throw lastError || new ApiError('Unknown error occurred');
}

/**
 * Convenience metody pro jednotlivé HTTP metody
 */
export const api = {
  get: <T>(url: string, config?: ApiRequestConfig) =>
    apiRequest<T>(url, { ...config, method: 'GET' }),

  post: <T>(url: string, data?: any, config?: ApiRequestConfig) =>
    apiRequest<T>(url, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: any, config?: ApiRequestConfig) =>
    apiRequest<T>(url, {
      ...config,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, config?: ApiRequestConfig) =>
    apiRequest<T>(url, { ...config, method: 'DELETE' }),
};
