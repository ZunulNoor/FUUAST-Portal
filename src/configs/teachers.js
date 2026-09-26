export default {
  title: 'Teachers',
  description: 'Browse all teachers. Super Admins manage teacher accounts.',
  endpoint: '/teachers',
  searchable: true,
  searchPlaceholder: 'Search teachers by name, login ID, or email',
  columns: [
    ['name', 'Name'],
    ['login_id', 'User Name'],
    ['email', 'Email'],
    ['employment_type', 'Employment'],
    [
      'is_coordinator',
      'Coordinator',
      (row) =>
        Number(row.is_coordinator) ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-success/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
            Coordinator
          </span>
        ) : (
          '—'
        ),
    ],
  ],
  adminColumns: [
    ['name', 'Name'],
    ['email', 'Email'],
    ['status', 'Status'],
    [
      'is_coordinator',
      'Coordinator',
      (row) =>
        Number(row.is_coordinator) ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-success/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
            Coordinator
          </span>
        ) : (
          '—'
        ),
    ],
  ],
  fields: [
    { name: 'name', label: 'Full name *', required: true },
    { name: 'login_id', label: 'User Name *', required: true },
    { name: 'email', label: 'Email *', required: true },
    { name: 'phone', label: 'Phone *', required: true },
    {
      name: 'employment_type',
      label: 'Employment',
      type: 'select',
      options: [
        { value: 'permanent', label: 'Permanent (full quotas)' },
        { value: 'contract', label: 'Contract (half-rate quotas)' },
        { value: 'visiting', label: 'Visiting (half-rate quotas)' },
      ],
    },
    { name: 'password', label: 'Password (optional)', type: 'password' },
  ],
  create: true,
  createRoles: ['super_admin'],
  edit: true,
  editRoles: ['super_admin'],
  coordinator: {
    roles: ['admin', 'keen_admin', 'super_admin'],
  },
  templateEndpoint: '/teachers/import/template',
  templateRoles: ['super_admin'],
  exportEndpoint: '/teachers/export',
  exportRoles: ['super_admin'],
  importEndpoint: '/teachers/import',
  importRoles: ['super_admin'],
};