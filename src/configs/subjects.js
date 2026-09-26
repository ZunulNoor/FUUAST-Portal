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
    { name: 'credit_hours', label: 'Credit hours', required: true },
    {
      name: 'expected_classes',
      label: 'Expected classes per semester',
      type: 'number',
      required: true,
      hint: 'Used to alert the department admin when a teacher falls behind schedule.',
    },
  ],
  create: true,
  edit: true,
};