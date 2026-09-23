'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { days } from '@/configs/helpers';
import { inputClass } from '@/components/ui/Field';

const dayLabel = (day) => day[0].toUpperCase() + day.slice(1);
const shortTime = (value) => (value ? value.slice(0, 5) : '');

export default function TimetableDays({ form, setForm }) {
  const [editing, setEditing] = useState({});

  const setDay = (day, patch) =>
    setForm({ ...form, days: { ...(form.days || {}), [day]: { ...(form.days?.[day] || {}), ...patch } } });

  const setEditingDay = (day, value) => setEditing((previous) => ({ ...previous, [day]: value }));

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
        Select days and times
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const value = form.days?.[day] || {};
          const checked = Boolean(value.enabled);
          const hasTimes = Boolean(value.start_time && value.end_time);
          const showInputs = checked && (!hasTimes || editing[day]);
          return (
            <div
              key={day}
              className={`flex min-w-0 flex-col gap-2 rounded-lg border p-2 transition ${checked ? 'border-action/40 bg-brand-soft/50' : 'border-line'}`}
            >
              <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setDay(day, { enabled: event.target.checked });
                    if (!event.target.checked) setEditingDay(day, false);
                  }}
                  className="h-4 w-4 shrink-0 accent-action"
                />
                {dayLabel(day)}
              </label>

              {checked && !showInputs ? (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-brand-dark">
                    {shortTime(value.start_time)} – {shortTime(value.end_time)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingDay(day, true)}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-action transition hover:border-action"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                </div>
              ) : null}

              {showInputs ? (
                <div className="grid grid-cols-2 gap-2">
                  {['Start', 'End'].map((label) => (
                    <label
                      key={label}
                      className="grid min-w-0 gap-0.5 text-[10px] font-semibold uppercase text-brand-dark"
                    >
                      {label}
                      <input
                        className={`${inputClass} h-8 w-full min-w-0`}
                        type="time"
                        value={value[label.toLowerCase() + '_time'] || ''}
                        onChange={(event) =>
                          setDay(day, { enabled: true, [label.toLowerCase() + '_time']: event.target.value })
                        }
                        required
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              {showInputs && hasTimes ? (
                <button
                  type="button"
                  onClick={() => setEditingDay(day, false)}
                  className="self-start text-[11px] font-semibold text-action hover:underline"
                >
                  Done
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
