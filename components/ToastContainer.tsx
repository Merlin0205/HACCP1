/**
 * Toast Container Component
 * 
 * Zobrazuje toast notifikace v pravém horním rohu
 */

import React, { useState, useEffect } from 'react';
import { toast, ToastOptions } from '../utils/toast';

interface ToastItem extends ToastOptions {
  id: string;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((options) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastItem = {
        id,
        duration: 5000,
        type: 'info',
        ...options,
      };

      setToasts(prev => [...prev, newToast]);

      // Auto remove po duration
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type: ToastOptions['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${getToastStyles(t.type)} px-4 py-3 rounded-lg shadow-lg max-w-md animate-slide-in pointer-events-auto flex items-center justify-between gap-3`}
        >
          <p className="text-sm font-medium flex-grow">{t.message}</p>
          <div className="flex items-center gap-2">
            {t.action && t.actionLabel && (
              <button
                onClick={() => {
                  t.action?.();
                  removeToast(t.id);
                }}
                className="text-xs font-bold underline hover:no-underline"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => removeToast(t.id)}
              className="text-lg font-bold hover:opacity-80"
              aria-label="Zavřít"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
