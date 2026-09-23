'use client';

import { Eye, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

export default function ResourceTable({
  resource,
  columns,
  rows,
  roleConfig,
  canEdit,
  onView,
  onEdit,
  onDelete,
  page,
  pagination,
  onChangePage,
}) {
  const hasActions = Boolean(roleConfig.edit || roleConfig.remove || roleConfig.detail);
  const gridTemplateColumns = `repeat(${columns.length}, minmax(120px, 1fr))${
    hasActions ? ' minmax(76px, auto)' : ''
  }`;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-line">
        <div
          className={`grid items-center gap-3 border-b border-line bg-brand-soft/50 px-4 py-2.5 ${hasActions ? '' : ''}`}
          style={{ gridTemplateColumns }}
        >
          {columns.map(([, label]) => (
            <span
              key={label}
              className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-dark"
            >
              {label}
            </span>
          ))}
          {hasActions ? (
            <span className="text-right text-[11px] font-bold uppercase tracking-wide text-brand-dark">
              Actions
            </span>
          ) : null}
        </div>
        {rows.length ? (
          rows.map((row, index) => (
            <div
              className="grid items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-surface/70"
              key={row.id || index}
              style={{ gridTemplateColumns }}
            >
              {columns.map(([key]) => (
                <span key={key} className="truncate text-sm text-ink">
                  {row[key] ?? '—'}
                </span>
              ))}
              {hasActions ? (
                <span className="flex items-center justify-end gap-1">
                  {resource === 'students' && roleConfig.detail ? (
                    <button
                      type="button"
                      onClick={() => onView(row)}
                      title="View courses & attendance"
                      aria-label="View courses"
                      className="grid h-8 w-9 place-items-center rounded-md text-action transition hover:bg-brand-soft"
                    >
                      <Eye size={15} />
                    </button>
                  ) : null}
                  {roleConfig.edit && canEdit ? (
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface"
                    >
                      Edit
                    </button>
                  ) : null}
                  {roleConfig.remove ? (
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      title="Delete"
                      aria-label="Delete"
                      className="grid h-8 w-9 place-items-center rounded-md text-danger transition hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
      <Pagination page={page} total={pagination?.total || 0} limit={pagination?.limit || 25} onChange={onChangePage} />
    </>
  );
}