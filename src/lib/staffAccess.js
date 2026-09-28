const administratorRoles = ['admin', 'super_admin', 'keen_admin'];
const superAdminRoles = ['super_admin'];

export const staffAccess = {
  workspace: ['admin', 'super_admin', 'keen_admin', 'teacher'],
  attendance: ['admin', 'super_admin', 'keen_admin', 'teacher'],
  'mark-attendance': ['teacher'],
  coordinator: ['teacher'],
  students: ['admin', 'super_admin', 'keen_admin', 'teacher'],
  reports: ['admin', 'super_admin', 'keen_admin'],
  'activity-logs': superAdminRoles,
  departments: superAdminRoles,
  users: superAdminRoles,
  teachers: ['admin', 'super_admin'],
  permissions: superAdminRoles,
  batches: ['admin', 'super_admin'],
  semesters: superAdminRoles,
  classes: ['admin', 'super_admin'],
  subjects: ['admin', 'super_admin'],
  assignments: ['admin', 'super_admin'],
  timetable: ['admin', 'super_admin'],
  thresholds: ['admin', 'super_admin'],
  settings: superAdminRoles,
  'hr-my-leaves': ['teacher', 'staff', 'super_admin'],
  'hr-approvals': [
    'super_admin',
    'chairman',
    'dean',
    'deputy_registrar',
    'registrar',
    'vice_chancellor',
    'management',
    'teacher',
  ],
  'hr-attendance': [
    'super_admin',
    'admin',
    'chairman',
    'deputy_registrar',
    'registrar',
    'management',
  ],
  'hr-staff': ['super_admin', 'admin', 'chairman', 'deputy_registrar', 'registrar', 'management'],
  'hr-rules': ['super_admin', 'deputy_registrar', 'registrar'],
};

export function canAccessStaffResource(role, resource, pageAccess = []) {
  if (role === 'assistant') return pageAccess.includes(resource);
  return Boolean(role && staffAccess[resource]?.includes(role));
}

export function isAdministrator(role) {
  return administratorRoles.includes(role);
}

export function isSuperAdmin(role) {
  return role === 'super_admin';
}
