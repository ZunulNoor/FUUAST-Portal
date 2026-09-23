'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { days } from '@/configs/helpers';

const dayLabel = (day) => day[0].toUpperCase() + day.slice(1);

const fallbackColors = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

const toMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  return Number.isFinite(hours) ? hours * 60 + (minutes || 0) : null;
};

const formatTime12 = (minutes) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

const textOn = (background) => {
  const hex = String(background).replace('#', '');
  if (hex.length !== 6) return '#1f2937';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#111827' : '#ffffff';
};

const entryColor = (entry, index) =>
  entry.color || fallbackColors[Number(entry.id || index) % fallbackColors.length];

const assignLayers = (entries) => {
  const sorted = [...entries].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time),
  );
  const layers = [];
  for (const entry of sorted) {
    const entryStart = toMinutes(entry.start_time);
    const entryEnd = toMinutes(entry.end_time);
    let placed = false;
    for (const layer of layers) {
      if (layer.every((e) => toMinutes(e.end_time) <= entryStart || toMinutes(e.start_time) >= entryEnd)) {
        layer.push(entry);
        placed = true;
        break;
      }
    }
    if (!placed) layers.push([entry]);
  }
  return layers;
};

const buildSegments = (layerEntries, minStart, totalRange) => {
  const sorted = [...layerEntries].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time),
  );
  const segments = [];
  let cursor = minStart;
  for (const entry of sorted) {
    const start = toMinutes(entry.start_time);
    const end = toMinutes(entry.end_time);
    if (start > cursor) {
      segments.push({ type: 'gap', widthPct: ((start - cursor) / totalRange) * 100 });
    }
    segments.push({ type: 'class', widthPct: ((end - start) / totalRange) * 100, entry });
    cursor = end;
  }
  if (cursor < minStart + totalRange) {
    segments.push({ type: 'gap', widthPct: ((minStart + totalRange - cursor) / totalRange) * 100 });
  }
  return segments;
};

export default function TimetableGrid({ entries = [], canEdit = false, onEdit, onDelete }) {
  const list = entries.filter(
    (entry) => entry && entry.day_of_week && entry.start_time && entry.end_time,
  );

  if (!list.length) {
    return (
      <p className="rounded-md border border-dashed border-line bg-paper/50 px-4 py-10 text-center text-sm text-muted">
        No timetable entries match the selected filters. Add classes to build a schedule.
      </p>
    );
  }

  const startTimes = list.map((entry) => toMinutes(entry.start_time));
  const endTimes = list.map((entry) => toMinutes(entry.end_time));
  const minStart = Math.min(...startTimes);
  const maxEnd = Math.max(...endTimes);
  const totalRange = maxEnd - minStart;
  const slotWidthPct = (30 / totalRange) * 100;

  const slotCount = Math.ceil(totalRange / 30);
  const slotLabels = Array.from({ length: slotCount }, (_, i) => minStart + i * 30);

  return (
    <div className="min-w-0">
      <p className="mb-3 text-xs text-muted">
        {list.length} class{list.length === 1 ? '' : 'es'} · colored by each class&apos;s
        selected color · {formatTime12(minStart)} to {formatTime12(maxEnd)}
        {canEdit ? ' · hover a class to edit or delete it' : ''}
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <div className="min-w-[720px]">
          {/* Day rows */}
          {days.map((day) => {
            const dayEntries = list.filter((entry) => entry.day_of_week === day);
            const layers = assignLayers(dayEntries);
            return (
              <div key={day} className="flex border-b border-line last:border-b-0">
                <div className="w-28 shrink-0 border-r border-line bg-surface/60 px-2 py-2 text-xs font-bold uppercase tracking-wide text-brand-dark">
                  {dayLabel(day)}
                </div>
                <div className="relative min-h-[52px] flex-1">
                  {/* Vertical slot guides */}
                  <div className="pointer-events-none absolute inset-0 flex">
                    {slotLabels.map((slot) => (
                      <div
                        key={slot}
                        style={{ width: `${slotWidthPct}%` }}
                        className="h-full border-r border-line/60"
                      />
                    ))}
                  </div>
                  {/* Layers */}
                  <div className="relative flex flex-col">
                    {layers.map((layer, li) => {
                      const segments = buildSegments(layer, minStart, totalRange);
                      return (
                        <div
                          key={`${day}-${li}`}
                          className={`flex min-h-[52px] ${li < layers.length - 1 ? 'border-b border-dashed border-line/40' : ''}`}
                        >
                          {segments.map((seg, si) =>
                            seg.type === 'gap' ? (
                              <div key={si} style={{ width: `${seg.widthPct}%` }} />
                            ) : (
                              <div
                                key={si}
                                style={{ width: `${seg.widthPct}%` }}
                                className="flex min-w-0 items-stretch p-0.5"
                              >
                                <div
                                  onClick={() => {
                                    if (canEdit && onEdit) onEdit(seg.entry);
                                  }}
                                  className={`group relative flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-md px-2 py-1.5 ${
                                    canEdit ? 'cursor-pointer transition hover:opacity-95' : ''
                                  }`}
                                  style={{
                                    backgroundColor: entryColor(seg.entry, si),
                                    color: textOn(entryColor(seg.entry, si)),
                                  }}
                                >
                                  {canEdit ? (
                                    <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (onEdit) onEdit(seg.entry);
                                        }}
                                        title="Edit class"
                                        aria-label="Edit class"
                                        className="grid h-6 w-6 place-items-center rounded-md bg-black/25 text-current backdrop-blur-[2px] transition hover:bg-black/40"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (onDelete) onDelete(seg.entry.id);
                                        }}
                                        title="Delete class"
                                        aria-label="Delete class"
                                        className="grid h-6 w-6 place-items-center rounded-md bg-black/25 text-current backdrop-blur-[2px] transition hover:bg-black/40"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ) : null}
                                  <div className="flex min-w-0 items-center justify-between gap-1">
                                    <p className="min-w-0 truncate text-sm font-extrabold leading-tight">
                                      {formatTime12(toMinutes(seg.entry.start_time))} –{' '}
                                      {formatTime12(toMinutes(seg.entry.end_time))}
                                    </p>
                                    {seg.entry.section_name ? (
                                      <span className="shrink-0 rounded-[4px] border border-current px-1.5 py-px text-[10px] font-extrabold uppercase tracking-wide opacity-90">
                                        Sec {seg.entry.section_name}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-px truncate text-[11px] font-bold leading-tight">
                                    {seg.entry.subject_name}
                                  </p>
                                  <p className="truncate text-[11px] font-semibold leading-tight opacity-85">
                                    {seg.entry.teacher_name || 'No teacher'}
                                  </p>
                                  {seg.entry.room ? (
                                    <p className="truncate text-[10px] font-semibold leading-tight opacity-90">
                                      Rm {seg.entry.room}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}