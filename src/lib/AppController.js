import { getEnvironment } from './ApiConfig';

export const STAFF_PORTAL_URL = 'https://fuuast-staff-portal.vercel.app/';
export const STUDENT_PORTAL_URL = 'https://fuuast-student-portal.vercel.app/';
// testing
export const PORTAL_URLS = {
  staff: STAFF_PORTAL_URL,
  student: STUDENT_PORTAL_URL,
};

export const APP_PORTAL = process.env.NEXT_PUBLIC_PORTAL || 'staff';

export function isLocalOrStaging() {
  return getEnvironment() === 'staging';
}

export function detectPortal() {
  if (typeof window === 'undefined') return null;
  const host = (window.location.hostname || '').toLowerCase();
  if (host.includes('student')) return 'student';
  if (host.includes('staff')) return 'staff';
  return null;
}

export function getDefaultPortal() {
  return APP_PORTAL === 'student' ? 'student' : 'staff';
}

export function getEnabledPortals() {
  return isLocalOrStaging() ? [getDefaultPortal()] : ['staff', 'student'];
}

export function isPortalEnabled(portal) {
  return getEnabledPortals().includes(portal);
}

export function getPortalLoginUrl(portal) {
  return PORTAL_URLS[portal] || STAFF_PORTAL_URL;
}

export function redirectToPortalLogin(portal) {
  if (typeof window === 'undefined') return;
  window.location.replace(getPortalLoginUrl(portal));
}

export function getRootLoginMode(portal) {
  const targetPortal = portal || getDefaultPortal();
  return { mode: 'render', portal: targetPortal };
}

export function isSameHostUrl(url) {
  if (typeof window === 'undefined') return false;
  try {
    const { hostname } = new URL(url, window.location.origin);
    return hostname === window.location.hostname;
  } catch {
    return false;
  }
}

export function getLoginMode(portal) {
  const targetPortal = portal || getDefaultPortal();
  if (isLocalOrStaging()) {
    return { mode: 'redirect', redirectPath: '/' };
  }
  const url = getPortalLoginUrl(targetPortal);
  return isSameHostUrl(url)
    ? { mode: 'redirect', redirectPath: '/' }
    : { mode: 'redirect', portal: targetPortal, url };
}

export function applyLoginMode(mode) {
  if (mode?.mode !== 'redirect' || typeof window === 'undefined') return;
  window.location.replace(mode.redirectPath || mode.url);
}

export function getPortalFromPath(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/staff')) return 'staff';
  return null;
}

export function isLoginPath(pathname) {
  return /^\/(?:staff|student)\/login/.test(pathname || '');
}

export function getDashboardPath(portal) {
  return portal === 'student' ? '/student' : '/staff';
}

export function getLoginPath(portal) {
  return portal === 'student' ? '/student/login' : '/staff/login';
}

export function getUserPortal(user) {
  if (!user) return null;
  if (user.portal === 'student' || user.role === 'student') return 'student';
  return 'staff';
}

export function resolvePortalAccess(pathname, user) {
  const userPortal = getUserPortal(user);

  if (!pathname || pathname === '/') {
    return userPortal ? { redirect: getDashboardPath(userPortal) } : null;
  }

  const portal = getPortalFromPath(pathname);
  if (!portal) return null;

  if (!isPortalEnabled(portal)) {
    return userPortal
      ? { redirect: getDashboardPath(getDefaultPortal()) }
      : { redirect: isLocalOrStaging() ? '/' : getLoginPath(getDefaultPortal()) };
  }

  if (!userPortal) {
    if (isLoginPath(pathname)) return null;
    return { redirect: isLocalOrStaging() ? '/' : getLoginPath(portal) };
  }

  if (userPortal !== portal) {
    return { redirect: getDashboardPath(userPortal) };
  }

  return isLoginPath(pathname) ? { redirect: getDashboardPath(userPortal) } : null;
}
