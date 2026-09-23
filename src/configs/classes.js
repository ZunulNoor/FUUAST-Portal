import { selectOptions } from './helpers';

export default {
  title: 'Classes and rooms',
  description: 'Create and maintain class sections, labs, and rooms used by courses.',
  endpoint: '/classes',
  columns: [
    ['class_code', 'Class / room'],
    ['department_id', 'Department'],
    ['batch_id', 'Batch'],
    ['section_name', 'Section / details'],
  ],
  fields: [
    { name: 'department_id', label: 'Department ID' },
    {
      name: 'batch_id',
      label: 'Batch',
      required: true,
      ...selectOptions('/batches', (row) => row.name),
    },
    {
      name: 'semester_id',
      label: 'Semester',
      required: true,
      ...selectOptions('/semesters', (row) => `Semester ${row.number}`),
    },
    { name: 'class_code', label: 'Class / room name', required: true },
    { name: 'section_name', label: 'Section / details', required: true },
  ],
  create: true,
  edit: true,
};