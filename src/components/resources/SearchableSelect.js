'use client';

import { useEffect, useState } from 'react';
import { staffApi } from '@/lib/api';
import { inputClass } from '@/components/ui/Field';

export default function SearchableSelect({ field, form, setForm, creatable = false }) {
  const [query, setQuery] = useState(form?.[field.textField] || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions([]);
      return;
    }
    let active = true;
    staffApi
      .get(field.optionsEndpoint, { params: { search: query.trim() } })
      .then((response) => {
        if (active) setOptions(response.data?.data || response.data || []);
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, [field.optionsEndpoint, open, query]);

  const select = (option) => {
    setForm({ ...form, [field.name]: option[field.optionValue], [field.textField]: undefined });
    setQuery(field.optionLabel(option));
    setOpen(false);
  };

  return (
    <div className="relative min-w-0">
      <input
        className={inputClass}
        type="search"
        value={query}
        placeholder={`Search ${field.label.toLowerCase()}...`}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setForm({
            ...form,
            [field.name]: '',
            ...(creatable ? { [field.textField]: event.target.value } : {}),
          });
          setOpen(true);
        }}
        required={field.required && !form[field.name] && !(creatable && form[field.textField])}
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-xl">
          {options.length ? (
            options.map((option) => (
              <button
                key={option[field.optionValue]}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-ink transition hover:bg-brand-soft/60"
              >
                {field.optionLabel(option)}
              </button>
            ))
          ) : creatable ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-2 text-left text-sm text-action"
            >
              Use &quot;{query}&quot; as a new {field.label.toLowerCase()}
            </button>
          ) : (
            <span className="block px-3 py-2 text-sm text-muted">No matching records.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}