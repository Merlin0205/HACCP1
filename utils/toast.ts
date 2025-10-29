/**
 * Toast notifikační systém
 * 
 * Jednoduchý toast systém bez závislosti na knihovnách
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: () => void;
  actionLabel?: string;
}

type ToastListener = (options: ToastOptions) => void;

class ToastManager {
  private listeners: ToastListener[] = [];

  /**
   * Registruje listener pro toast události
   */
  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Zobrazí toast notifikaci
   */
  show(options: ToastOptions) {
    this.listeners.forEach(listener => listener(options));
  }

  /**
   * Convenience metody
   */
  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }
}

export const toast = new ToastManager();
