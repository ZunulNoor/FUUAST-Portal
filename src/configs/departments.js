export default {
  title: 'Departments',
  description: 'Create and maintain academic departments.',
  endpoint: '/departments',
  columns: [
    ['id', 'ID'],
    ['name', 'Name'],
    ['code', 'Code'],
  ],
  fields: [
    { name: 'name', label: 'Department name', required: true },
    { name: 'code', label: 'Department code', required: true },
  ],
  create: true,
  edit: true,
  remove: false,
};