/**
 * Centrální error handling pro celou aplikaci
 */

import { ApiError } from '../services/client';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorInfo {
  message: string;
  severity: ErrorSeverity;
  details?: string;
  action?: () => void;
  actionLabel?: string;
}

/**
 * Převede Error objekt na user-friendly chybovou zprávu
 */
export function handleError(error: unknown): ErrorInfo {
  console.error('[ErrorHandler]', error);

  // API chyby
  if (error instanceof ApiError) {
    if (error.statusCode === 408 || error.message.includes('timeout')) {
      return {
        message: 'Požadavek trval příliš dlouho',
        severity: 'warning',
        details: 'Zkuste to prosím znovu. Pokud problém přetrvává, zkontrolujte připojení k internetu.',
      };
    }

    if (error.statusCode === 500) {
      return {
        message: 'Chyba serveru',
        severity: 'error',
        details: 'Na serveru došlo k chybě. Zkuste to prosím za chvíli znovu.',
      };
    }

    if (error.statusCode === 404) {
      return {
        message: 'Data nebyla nalezena',
        severity: 'warning',
        details: error.message,
      };
    }

    // Generická API chyba
    return {
      message: 'Chyba komunikace se serverem',
      severity: 'error',
      details: error.message,
    };
  }

  // Network chyby
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Nelze se připojit k serveru',
      severity: 'critical',
      details: 'Zkontrolujte, zda běží backend server a máte připojení k internetu.',
    };
  }

  // Obecné Error objekty
  if (error instanceof Error) {
    return {
      message: error.message || 'Došlo k neočekávané chybě',
      severity: 'error',
      details: error.stack,
    };
  }

  // Neznámá chyba
  return {
    message: 'Došlo k neočekávané chybě',
    severity: 'error',
    details: String(error),
  };
}

/**
 * Wrapper pro async funkce s error handlingem
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: ErrorInfo) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const errorInfo = handleError(error);
    onError?.(errorInfo);
    return null;
  }
}
