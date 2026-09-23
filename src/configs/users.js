export default {
  title: 'Users',
  description: 'Create staff accounts and manage their status.',
  endpoint: '/users',
  columns: [
    ['name', 'Name'],
    ['username', 'Username'],
    ['role', 'Role'],
    ['status', 'Status'],
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email', required: true },
    { name: 'username', label: 'Username', required: true },
    {
      name: 'role',
      label: 'Role',
      required: true,
      type: 'select',
      options: [
        { value: 'admin', label: 'Department Admin' },
        { value: 'assistant', label: 'Assistant' },
      ],
    },
    { name: 'department_id', label: 'Department ID' },
    { name: 'password', label: 'Password (optional)', type: 'password' },
  ],
  create: true,
  edit: true,
  remove: false,
};