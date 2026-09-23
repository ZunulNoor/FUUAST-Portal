'use client';

const VARIANTS = {
  primary:
    'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-danger/30 bg-paper px-4 text-sm font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold text-action transition hover:bg-brand-soft/60 disabled:cursor-not-allowed disabled:opacity-50',
  icon: 'grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface hover:text-ink',
};

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${VARIANTS[variant]} ${className}`} {...props} />;
}