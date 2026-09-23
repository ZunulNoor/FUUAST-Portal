'use client';

import { inputClass } from '@/components/ui/Field';

export default function BatchSemestersManager({
  batchSemesters,
  updateBatchSemester,
  toDateInputValue,
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">Semester</h3>
      </div>
      {batchSemesters.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {batchSemesters.map((semester, index) => (
            <div className="rounded-lg border border-line p-2" key={semester.id || `new-${index}`}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {semester.id
                  ? `Semester ${semester.number}`
                  : 'First semester (created with the batch)'}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
                  Number
                  <input
                    className={`${inputClass} h-8 w-16`}
                    type="number"
                    required
                    value={semester.number || ''}
                    onChange={(event) => updateBatchSemester(index, { number: event.target.value })}
                  />
                </label>
                {['start_date', 'end_date'].map((key) => (
                  <label
                    key={key}
                    className="grid min-w-[110px] flex-1 gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark"
                  >
                    {key === 'start_date' ? 'Start' : 'End'}
                    <input
                      className={`${inputClass} h-8`}
                      type="date"
                      value={toDateInputValue(semester[key])}
                      onChange={(event) =>
                        updateBatchSemester(index, { [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="flex items-end gap-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
                  <input
                    type="checkbox"
                    checked={Boolean(semester.is_active)}
                    onChange={(event) =>
                      updateBatchSemester(index, { is_active: event.target.checked ? 1 : 0 })
                    }
                    className="h-4 w-4 accent-action"
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Only one semester is opened at a time. Add it when creating the batch.
        </p>
      )}
    </div>
  );
}
