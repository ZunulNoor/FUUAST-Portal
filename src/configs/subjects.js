export default {
  title: 'Subjects',
  description: 'Manage subject catalog.',
  endpoint: '/subjects',
  columns: [
    ['code', 'Code'],
    ['name', 'Name'],
    ['department_id', 'Department'],
    ['credit_hours', 'Credits'],
    ['expected_classes', 'Expected classes'],
  ],
  fields: [
    { name: 'department_id', label: 'Department ID', required: true },
    { name: 'code', label: 'Subject code', required: true },
    { name: 'name', label: 'Subject name', required: true },
    { name: 'credit_hours', label: 'Credit hours', hint: 'Optional — defaults to 3.0.' },
    {
      name: 'expected_classes',
      label: 'Expected classes per semester',
      type: 'number',
      hint: 'Optional — defaults to 42. Used to alert the department admin when a teacher falls behind schedule.',
    },
  ],
  create: true,
  edit: true,
};
