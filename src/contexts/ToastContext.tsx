// ═══════════════════════════════════════════════════
// DocuMind AI — Toast Notification Context
// ═══════════════════════════════════════════════════

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Toast, ToastType } from '@/types';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const MAX_TOASTS = 4;
const AUTO_DISMISS_MS = 4000;

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};


export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = uuidv4();
      const toast: Toast = { id, type, message, createdAt: Date.now() };

      setToasts((prev) => {
        const next = [toast, ...prev];
        // Remove oldest if over limit
        if (next.length > MAX_TOASTS) {
          const removed = next.pop();
          if (removed) {
            const timer = timersRef.current.get(removed.id);
            if (timer) clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
        }
        return next;
      });

      // Auto-dismiss
      const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="toast-stack" id="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-card ${toast.type}`}
            onClick={() => removeToast(toast.id)}
            role="alert"
            aria-live="assertive"
          >
            <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
