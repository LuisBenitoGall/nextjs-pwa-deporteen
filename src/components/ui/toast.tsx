'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
  duration?: number;
}

interface ToastInternal extends ToastOptions {
  id: number;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = 'default', duration = 3500 }: ToastOptions) => {
      const id = ++counterRef.current;
      const createdAt = Date.now();
      const toast: ToastInternal = { id, createdAt, title, description, variant, duration };
      setToasts((current) => [...current, toast]);
      if (duration > 0) {
        window.setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => removeToast(toast.id)}
            className={cn(
              'w-full rounded-lg border px-4 py-3 text-left shadow transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500',
              toast.variant === 'destructive'
                ? 'border-red-600/50 bg-red-600/15 text-red-100'
                : toast.variant === 'success'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100'
                : 'border-slate-700 bg-slate-900/90 text-slate-100',
            )}
          >
            <p className="text-sm font-semibold leading-tight">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-xs text-slate-300">{toast.description}</p>
            )}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
