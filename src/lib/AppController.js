import { getEnvironment } from './ApiConfig';

export const STAFF_PORTAL_URL = 'https://fuuast-staff-portal.vercel.app/';
export const STUDENT_PORTAL_URL = 'https://fuuast-student-portal.vercel.app/';
export const PORTAL_URLS = {
  staff: STAFF_PORTAL_URL,
  student: STUDENT_PORTAL_URL,
};

export const APP_PORTAL = 'staff';

// Only the default portal is enabled on a host.
// 'staff' -> /student/* bounces to staff login/dashboard.
// 'student' -> /staff/* bounces to student login/dashboard.
// Set to false to allow both portals on the same host.
export const SINGLE_PORTAL_LOCK = true;

export function isLocalOrStaging() {
  return getEnvironment() === 'staging';
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

const STAFF_HOST = hostnameOf(STAFF_PORTAL_URL);
const STUDENT_HOST = hostnameOf(STUDENT_PORTAL_URL);

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

export function detectPortal() {
  if (typeof window === 'undefined') return null;
  const host = (window.location.hostname || '').toLowerCase();
  if (host && host === STAFF_HOST) return 'staff';
  if (host && host === STUDENT_HOST) return 'student';
  if (host.includes('student')) return 'student';
  if (host.includes('staff')) return 'staff';
  return null;
}

export function getDefaultPortal() {
  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return APP_PORTAL === 'student' ? 'student' : 'staff';
    }
    const detected = detectPortal();
    if (detected) return detected;
  }
  return APP_PORTAL === 'student' ? 'student' : 'staff';
}

export function getEnabledPortals() {
  if (!SINGLE_PORTAL_LOCK) return ['staff', 'student'];
  return [getDefaultPortal()];
}

export function isPortalEnabled(portal) {
  return getEnabledPortals().includes(portal);
}

export function getPortalLoginUrl(portal) {
  return PORTAL_URLS[portal] || STAFF_PORTAL_URL;
}

export function redirectToPortalLogin(portal) {
  if (typeof window === 'undefined') return;
  if (isLocalHost()) {
    window.location.replace('/');
    return;
  }
  window.location.replace(getPortalLoginUrl(portal));
}

export function getRootLoginMode(portal) {
  const targetPortal = portal || getDefaultPortal();
  return { mode: 'render', portal: targetPortal };
}

export function getLoginMode(portal) {
  const targetPortal = portal || getDefaultPortal();
  return { mode: 'render', portal: targetPortal };
}

export function applyLoginMode(mode) {
  if (!mode || typeof window === 'undefined') return;
  if (mode.mode === 'redirect') {
    window.location.replace(mode.redirectPath || mode.url);
  }
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
    if (userPortal) return { redirect: getDashboardPath(userPortal) };
    return null;
  }

  const portal = getPortalFromPath(pathname);

  if (!portal) {
    return userPortal ? { redirect: getDashboardPath(userPortal) } : { redirect: '/' };
  }

  if (!isPortalEnabled(portal)) {
    return userPortal ? { redirect: getDashboardPath(userPortal) } : { redirect: '/' };
  }

  if (!userPortal) {
    return { redirect: '/' };
  }

  if (userPortal !== portal) {
    return { redirect: getDashboardPath(userPortal) };
  }

  return isLoginPath(pathname) ? { redirect: getDashboardPath(userPortal) } : null;
}
