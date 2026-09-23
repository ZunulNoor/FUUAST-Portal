'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FieldInput from './FieldInput';
import BatchForm from './BatchForm';

const SIZES = {
  attendance: 'xl',
  timetable: 'lg',
  batches: 'lg',
  classes: 'lg',
  assignments: 'md',
  students: 'md',
  users: 'md',
  teachers: 'md',
  subjects: 'md',
  departments: 'sm',
  semesters: 'sm',
};

export default function ResourceFormModal({
  resource,
  config,
  user,
  form,
  setForm,
  fieldOptions,
  visiblePasswords,
  togglePassword,
  error,
  onSubmit,
  onClose,
  batchSemesters,
  addBatchSemester,
  updateBatchSemester,
  removeBatchSemester,
  toDateInputValue,
}) {
  const fieldInputProps = { form, setForm, fieldOptions, visiblePasswords, togglePassword };

  return (
    <Modal
      size={SIZES[resource] || 'md'}
      eyebrow={form?.id ? 'EDIT RECORD' : 'NEW RECORD'}
      title={config.title}
      onClose={onClose}
    >
      <form className="flex min-h-0 flex-col" onSubmit={onSubmit}>
        <div className="min-w-0 overflow-hidden p-5 sm:p-6">
          {resource === 'batches' ? (
            <BatchForm
              config={config}
              user={user}
              form={form}
              setForm={setForm}
              fieldOptions={fieldOptions}
              visiblePasswords={visiblePasswords}
              togglePassword={togglePassword}
              batchSemesters={batchSemesters}
              addBatchSemester={addBatchSemester}
              updateBatchSemester={updateBatchSemester}
              removeBatchSemester={removeBatchSemester}
              toDateInputValue={toDateInputValue}
            />
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  className={field.type === 'days' ? 'sm:col-span-2' : ''}
                  {...fieldInputProps}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-3 sm:px-6">
          {error ? (
            <p
              className="mr-auto max-w-full break-words text-xs font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit">Save record</Button>
        </div>
      </form>
    </Modal>
  );
}
