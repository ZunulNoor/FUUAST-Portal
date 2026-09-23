'use client';

export const inputClass =
  'h-9 w-full min-w-0 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-action focus:ring-2 focus:ring-action/20';

export default function Field({ label, className = '', children, hint }) {
  return (
    <label className={`grid min-w-0 content-start gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-dark ${className}`}>
      {label}
      {children}
      {hint ? (
        <span className="text-[11px] font-normal normal-case tracking-normal text-muted">{hint}</span>
      ) : null}
    </label>
  );
}