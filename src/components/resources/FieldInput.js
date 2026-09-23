'use client';

import { Eye, EyeOff } from 'lucide-react';
import Field, { inputClass } from '@/components/ui/Field';
import TimetableDays from './TimetableDays';
import SearchableSelect from './SearchableSelect';

export default function FieldInput({
  field,
  form,
  setForm,
  fieldOptions,
  visiblePasswords,
  togglePassword,
  className = '',
}) {
  if (field.type === 'days') {
    return (
      <div className={className}>
        <TimetableDays form={form} setForm={setForm} />
      </div>
    );
  }

  if (field.type === 'searchable-select' || field.type === 'creatable-select') {
    return (
      <Field label={field.label} className={className}>
        <SearchableSelect
          field={field}
          form={form}
          setForm={setForm}
          creatable={field.type === 'creatable-select'}
        />
      </Field>
    );
  }

  if (field.type === 'color') {
    const palette = [
      '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
      '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6',
      '#f97316', '#84cc16', '#06b6d4', '#a855f7',
    ];
    const value = form[field.name] || '';
    return (
      <Field label={field.label} className={className} hint={field.hint}>
        <div className="flex flex-wrap items-center gap-2">
          {palette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setForm({ ...form, [field.name]: swatch })}
              style={{ backgroundColor: swatch }}
              aria-label={`Color ${swatch}`}
              title={swatch}
              className={`h-8 w-8 rounded-full border-2 transition ${
                value.toUpperCase() === swatch
                  ? 'border-ink ring-2 ring-action/50'
                  : 'border-white/70 hover:scale-105'
              }`}
            />
          ))}
          {value ? (
            <button
              type="button"
              onClick={() => setForm({ ...form, [field.name]: '' })}
              className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      </Field>
    );
  }

  if (field.type === 'password') {
    const isEdit = Boolean(form?.id);
    const isVisible = visiblePasswords?.[field.name];
    return (
      <Field label={isEdit ? 'Password (optional)' : 'Password *'} className={className}>
        <span className="relative block">
          <input
            className={`${inputClass} pr-10`}
            type={isVisible ? 'text' : 'password'}
            value={form[field.name] || ''}
            onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
            required={field.required && !isEdit}
          />
          <button
            type="button"
            onClick={() => togglePassword(field.name)}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </Field>
    );
  }

  if (field.type === 'select') {
    const options = field.options || fieldOptions?.[field.name] || [];
    return (
      <Field label={field.label} className={className}>
        <select
          className={inputClass}
          value={form[field.name] || ''}
          onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
          required={field.required}
        >
          <option value="">Select {field.label}</option>
          {options.map((option) => (
            <option
              key={option.value || option[field.optionValue]}
              value={option.value || option[field.optionValue]}
            >
              {option.label || field.optionLabel(option)}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field label={field.label} className={className}>
      <input
        className={inputClass}
        type={field.type || 'text'}
        value={form[field.name] || ''}
        onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
        required={field.required}
        disabled={field.readOnly}
      />
    </Field>
  );
}
