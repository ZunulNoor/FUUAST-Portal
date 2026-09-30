import { create } from 'zustand';

const PENDING_KEY = 'fuuast_pending_toast';
let idSeq = 0;

const DEFAULT_DURATIONS = {
  success: 4000,
  error: 10000,
};

export const useToastStore = create((set, get) => ({
  toasts: [],
  // durationMs: how long the toast stays (ms). Defaults: success 4s, error
  // 10s. Pass 0 to pin it until manually dismissed with the X button.
  toast: (type, message, durationMs) => {
    const id = ++idSeq;
    const duration = durationMs ?? DEFAULT_DURATIONS[type] ?? 4000;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    if (duration > 0) setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  success: (message, durationMs) => get().toast('success', message, durationMs),
  error: (message, durationMs) => get().toast('error', message, durationMs),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function stashPendingToast(message) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, message);
  } catch {
    /* ignore */
  }
}

export function consumePendingToast() {
  try {
    const message = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    return message;
  } catch {
    return null;
  }
}
