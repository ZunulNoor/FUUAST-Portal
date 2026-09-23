'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useToastStore, consumePendingToast } from '@/store/toastStore';

export default function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const pending = consumePendingToast();
    if (pending) useToastStore.getState().success(pending);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2.5 rounded-md border px-3.5 py-3 shadow-2xl ${
            toast.type === 'error'
              ? 'border-danger/30 bg-red-50 text-danger'
              : 'border-success/30 bg-success/10 text-success'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="mt-[1px] shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="mt-[1px] shrink-0" />
          )}
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-muted transition hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}