'use client';

export default function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (!total || pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <span className="text-xs text-muted">
        Page {page} of {pages} ({total} students)
      </span>
      <div className="flex gap-2">
        {[
          { label: 'Previous', disabled: page <= 1, value: page - 1 },
          { label: 'Next', disabled: page >= pages, value: page + 1 },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}