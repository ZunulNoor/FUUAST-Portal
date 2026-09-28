import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  shouldCacheRequest,
  getCached,
  setCached,
  invalidateForMutation,
  setSessionMarker,
  inflight,
} from './apiCache';
import { PROXY_BASE_URL, PORTAL_BACKEND } from './ApiConfig';

// Browser talks same-origin to /api/backend; `x-backend` picks the upstream server-side.
const PROXY_BASE = PROXY_BASE_URL;

export const studentApi = axios.create({
  baseURL: PROXY_BASE,
  headers: {
    'Content-Type': 'application/json',
    'x-backend': PORTAL_BACKEND.student,
  },
});

export const staffApi = axios.create({
  baseURL: PROXY_BASE,
  headers: {
    'Content-Type': 'application/json',
    'x-backend': PORTAL_BACKEND.staff,
  },
});

export const leaveApi = axios.create({
  baseURL: PROXY_BASE,
  headers: {
    'Content-Type': 'application/json',
    'x-backend': 'leave',
  },
});

const attachTokenInterceptor = (client) => {
  client.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().accessToken;
      setSessionMarker(token ? String(token).slice(-8) : '');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          try {
            const isStudent = useAuthStore.getState().user?.role === 'student';

            const res = await axios.post(
              `${PROXY_BASE}/auth/refresh`,
              { refreshToken },
              {
                headers: { 'x-backend': isStudent ? PORTAL_BACKEND.student : PORTAL_BACKEND.staff },
              },
            );
            const newAccessToken = res.data.accessToken;
            const newRefreshToken = res.data.refreshToken || refreshToken;

            useAuthStore.getState().setSession({
              user: useAuthStore.getState().user,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            });

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshErr) {
            useAuthStore.getState().clearSession();
            if (typeof window !== 'undefined') {
              const portal =
                useAuthStore.getState().user?.portal === 'student' ? 'student' : 'staff';
              window.location.href = `/${portal}/login`;
            }
          }
        } else {
          useAuthStore.getState().clearSession();
        }
      }
      return Promise.reject(error);
    },
  );
};

const attachCacheInterceptor = (client) => {
  client.interceptors.request.use(async (config) => {
    if (!shouldCacheRequest(config)) return config;
    const found = getCached(config);
    if (found.hit) {
      const data = found.data;
      config.adapter = async () => ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        fromCache: true,
      });
      return config;
    }
    const pending = inflight.get(found.key);
    if (pending) {
      config.adapter = async () => {
        const live = await pending;
        return {
          data: live.data,
          status: live.status || 200,
          statusText: 'OK',
          headers: {},
          config,
          fromCache: true,
        };
      };
      return config;
    }
    let settle;
    const gate = new Promise((resolve, reject) => {
      settle = { resolve, reject };
    });
    inflight.set(found.key, gate);
    config.__cacheKey = found.key;
    config.__cacheSettle = settle;
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const config = response.config || {};
      if (config.__cacheSettle) {
        try {
          inflight.delete(config.__cacheKey);
          config.__cacheSettle.resolve({ data: response.data, status: response.status });
        } catch {
          /* noop */
        }
      }
      if (response.fromCache) return response;
      const method = String(config.method || 'get').toLowerCase();
      if (method === 'get') {
        if (shouldCacheRequest(config) && response.status >= 200 && response.status < 300) {
          setCached(config, response.data);
        }
      } else {
        invalidateForMutation(config);
      }
      return response;
    },
    (error) => {
      const config = error?.config || {};
      if (config.__cacheSettle) {
        try {
          inflight.delete(config.__cacheKey);
          config.__cacheSettle.reject(error);
        } catch {
          /* noop */
        }
      }
      return Promise.reject(error);
    },
  );
};

attachTokenInterceptor(studentApi);
attachTokenInterceptor(staffApi);
attachTokenInterceptor(leaveApi);

attachCacheInterceptor(studentApi);
attachCacheInterceptor(staffApi);
attachCacheInterceptor(leaveApi);

export const getApiClient = (role) => {
  return role === 'student' ? studentApi : staffApi;
};
