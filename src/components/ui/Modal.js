'use client';

import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-action">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="truncate text-lg font-bold text-ink">{title}</h2>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-surface hover:text-ink"
        >
          <X size={18} />
        </button>
      ) : null}
    </header>
  );
}

export default function Modal({
  size = 'md',
  eyebrow,
  title,
  onClose,
  children,
  footer,
}) {
  const width = SIZES[size] || SIZES.md;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[100dvh] w-full ${width} flex-col overflow-hidden bg-paper shadow-2xl max-sm:fixed max-sm:inset-0 max-sm:rounded-none sm:max-h-[calc(100vh-2.5rem)] sm:rounded-xl`}
      >
        {title || onClose ? <ModalHeader eyebrow={eyebrow} title={title} onClose={onClose} /> : null}
        <div className="grow overflow-hidden min-w-0 max-sm:overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-3 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}