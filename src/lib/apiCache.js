// Central client-side GET cache for all API clients (staff/student/leave).
// Going back to a visited page serves instantly from memory instead of
// re-hitting the API. Writes auto-invalidate their own resource area, and
// login/logout clears everything (so users never see each other's data).
//
// Safety rules:
// - GET only, 2xx only, never blobs/files, never /auth/* or captchas.
// - Keys include the backend (x-backend); user switches clear everything.
// - Bounded (LRU-ish cap) + TTL expiry so memory can't grow.

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const LONG_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 200;

const LONG_LIVED =
  /^(\/(departments|semesters|batches|subjects|hr\/rules|hr\/departments|permissions))($|\?|\/)/;
const NEVER_CACHE = /^(\/auth\/|\/student\/captcha)/;

const store = new Map(); // key -> { data, expires, backend, root }
const inflight = new Map(); // key -> Promise (dedupes simultaneous identical GETs)
let setsSinceSweep = 0;
let sessionMarker = ''; // tail of the current access token; isolates users

function header(config, name) {
  const headers = config?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    try {
      return headers.get(name) || '';
    } catch {
      return '';
    }
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function backendOf(config) {
  return String(header(config, 'x-backend') || '');
}

// Normalized app path, e.g. '/teachers' or '/hr/leaves/pending'.
function pathOf(config) {
  const full = `${config.baseURL || ''}${config.url || ''}`;
  return full.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/backend/i, '') || '/';
}

function rootOf(path) {
  return path.split('?')[0].split('/').filter(Boolean)[0] || '';
}

export function setSessionMarker(marker) {
  sessionMarker = String(marker || '');
}

export function cacheKeyFor(config) {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${String(config.method || 'get').toUpperCase()}|${sessionMarker}|${backendOf(config)}|${pathOf(config)}|${params}`;
}

function ttlFor(config) {
  const path = pathOf(config).split('?')[0];
  if (LONG_LIVED.test(path)) return LONG_TTL_MS;
  return DEFAULT_TTL_MS;
}

export function shouldCacheRequest(config) {
  if (!config || String(config.method || 'get').toLowerCase() !== 'get') return false;
  if (config.noCache) return false;
  if (config.responseType && config.responseType !== 'json') return false;
  if (NEVER_CACHE.test(pathOf(config).split('?')[0])) return false;
  return true;
}

export function getCached(config) {
  const key = cacheKeyFor(config);
  const entry = store.get(key);
  if (!entry) return { hit: false, key };
  if (Date.now() > entry.expires) {
    store.delete(key);
    return { hit: false, key };
  }
  return { hit: true, key, data: entry.data };
}

export function setCached(config, data, ttl) {
  const key = cacheKeyFor(config);
  store.set(key, {
    data,
    expires: Date.now() + (ttl || ttlFor(config)),
    backend: backendOf(config),
    root: rootOf(pathOf(config)),
  });
  setsSinceSweep += 1;
  if (store.size > MAX_ENTRIES) {
    // Evict oldest-inserted first (Map preserves insertion order).
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  if (setsSinceSweep >= 50) {
    setsSinceSweep = 0;
    const now = Date.now();
    for (const [k, v] of store) if (v.expires <= now) store.delete(k);
  }
  return key;
}

// Drop every cached GET in the same backend + resource root as a mutating
// request. Login/logout clears everything (user switch); token refresh
// touches nothing (same user).
export function invalidateForMutation(config) {
  const backend = backendOf(config);
  const fullPath = pathOf(config).split('?')[0];
  const root = rootOf(fullPath);
  if (root === 'auth') {
    if (/^\/(auth)\/(login|logout)/.test(fullPath)) {
      const n = store.size;
      store.clear();
      return `all(auth:${n})`;
    }
    return 'auth:0';
  }
  let dropped = 0;
  for (const [key, entry] of store) {
    if (entry.backend === backend && entry.root === root) {
      store.delete(key);
      dropped += 1;
    }
  }
  return `${root}:${dropped}`;
}

export function clearApiCache() {
  store.clear();
}

export function __cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}

export { inflight };
