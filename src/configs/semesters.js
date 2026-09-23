export default {
  title: 'Semesters',
  description: 'Manage semesters within batches.',
  endpoint: '/semesters',
  columns: [
    ['number', 'Number'],
    ['batch_id', 'Batch'],
    ['status', 'Status'],
  ],
  fields: [
    { name: 'batch_id', label: 'Batch ID', required: true },
    { name: 'number', label: 'Semester number', required: true },
  ],
  create: true,
};