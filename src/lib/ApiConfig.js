export const PROXY_BASE_URL = '/api/backend';

export const PORTAL_BACKEND = {
  student: 'student',
  staff: 'staff',
};

const BACKEND_URLS = {
  student: 'student upstream (server-only STUDENT_API_URL)',
  staff: 'staff upstream (server-only STAFF_API_URL)',
};

export const API_ENVIRONMENTS = {
  staging: { ...BACKEND_URLS },
  production: { ...BACKEND_URLS },
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
  void portal;
  return PROXY_BASE_URL;
}

export function getStudentApiBaseUrl() {
  return getApiBaseUrl('student');
}

export function getStaffApiBaseUrl() {
  return getApiBaseUrl('staff');
}

export function getBackendHeader(portal) {
  return PORTAL_BACKEND[portal] || PORTAL_BACKEND.staff;
}
