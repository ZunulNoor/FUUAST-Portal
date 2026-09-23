const BACKEND_URLS = {
  student: 'https://student.attendance.petzone.pk/api',
  staff: 'https://staff.petzone.pk/api',
};

export const API_ENVIRONMENTS = {
  staging: {
    ...BACKEND_URLS,
  },
  production: {
    ...BACKEND_URLS,
  },
};

const ENV_OVERRIDES = {
  student: process.env.NEXT_PUBLIC_API_STUDENT_URL,
  staff: process.env.NEXT_PUBLIC_API_STAFF_URL,
};

export function isLocalDevelopment() {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  }
  return process.env.NODE_ENV === 'development';
}

export function getEnvironment() {
  return isLocalDevelopment() ? 'staging' : 'production';
}

export function getApiBaseUrl(portal) {
  return ENV_OVERRIDES[portal] || API_ENVIRONMENTS[getEnvironment()][portal];
}

export function getStudentApiBaseUrl() {
  return getApiBaseUrl('student');
}

export function getStaffApiBaseUrl() {
  return getApiBaseUrl('staff');
}
