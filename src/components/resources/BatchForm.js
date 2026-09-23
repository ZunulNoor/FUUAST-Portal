'use client';

import Field, { inputClass } from '@/components/ui/Field';
import FieldInput from './FieldInput';
import BatchSemestersManager from './BatchSemestersManager';

const sectionOptions = ['A', 'B', 'C'];

export default function BatchForm({
  config,
  user,
  form,
  setForm,
  fieldOptions,
  visiblePasswords,
  togglePassword,
  batchSemesters,
  updateBatchSemester,
  toDateInputValue,
}) {
  const departmentField = config.fields.find((field) => field.name === 'department_id');
  const fieldInputProps = { form, setForm, fieldOptions, visiblePasswords, togglePassword };
  const departmentLocked = Boolean(form.id) || user?.role === 'admin';
  const creating = !form.id;
  const selectedSections = Array.isArray(form.sections) ? form.sections : [];
  const toggleSection = (section) => {
    const next = selectedSections.includes(section)
      ? selectedSections.filter((entry) => entry !== section)
      : [...selectedSections, section];
    setForm({ ...form, sections: next });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      {departmentLocked ? (
        <Field label="Department" className="sm:col-span-2">
          <input
            className={inputClass}
            value={
              form.department_name ||
              (user?.role === 'admin'
                ? `Department #${form.department_id || ''}`
                : `#${form.department_id || ''}`)
            }
            disabled
          />
        </Field>
      ) : (
        <FieldInput
          field={{ ...departmentField, required: true }}
          className="sm:col-span-2"
          {...fieldInputProps}
        />
      )}
      <FieldInput
        field={{ name: 'name', label: 'Batch name', required: true, type: 'text' }}
        {...fieldInputProps}
      />
      <FieldInput
        field={{ name: 'start_year', label: 'Start year', required: true, type: 'number' }}
        {...fieldInputProps}
      />
      <FieldInput
        field={{ name: 'end_year', label: 'End year', required: true, type: 'number' }}
        {...fieldInputProps}
      />
      <Field
        label="Sections"
        className="sm:col-span-2"
        hint={
          creating
            ? 'Sections are created for this batch’s first semester.'
            : 'Sections are shown for this batch. Deselect to remove an empty section.'
        }
      >
        <div className="flex flex-wrap gap-2">
          {sectionOptions.map((section) => {
            const selected = selectedSections.includes(section);
            return (
              <button
                type="button"
                key={section}
                onClick={() => toggleSection(section)}
                className={`h-10 w-14 rounded-md border text-sm font-bold transition ${
                  selected
                    ? 'border-brand bg-brand text-white shadow-sm'
                    : 'border-line bg-paper text-ink hover:border-brand'
                }`}
              >
                {section}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="sm:col-span-2">
        <BatchSemestersManager
          batchSemesters={batchSemesters}
          updateBatchSemester={updateBatchSemester}
          toDateInputValue={toDateInputValue}
        />
      </div>
    </div>
  );
}
