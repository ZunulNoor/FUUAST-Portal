import { create } from 'zustand';

const PENDING_KEY = 'fuuast_pending_toast';
let idSeq = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  toast: (type, message) => {
    const id = ++idSeq;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => get().dismiss(id), 4000);
  },
  success: (message) => get().toast('success', message),
  error: (message) => get().toast('error', message),
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