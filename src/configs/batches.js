import { searchableOptions } from './helpers';

export default {
  title: 'Batches',
  description: 'Manage batches within your department.',
  endpoint: '/batches',
  columns: [
    ['name', 'Name'],
    ['department_name', 'Department'],
    ['current_semester', 'Current semester'],
    ['start_year', 'Start year'],
    ['end_year', 'End year'],
  ],
  fields: [
    {
      name: 'department_id',
      label: 'Department',
      required: true,
      ...searchableOptions('/departments', (row) => row.name),
    },
    { name: 'name', label: 'Batch name', required: true },
    { name: 'start_year', label: 'Start year', required: true },
    { name: 'end_year', label: 'End year', required: true },
  ],
  create: true,
  createRoles: ['super_admin'],
  edit: true,
  editRoles: ['super_admin', 'keen_admin', 'admin'],
  filters: ['department'],
};
