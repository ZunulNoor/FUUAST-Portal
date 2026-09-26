import axios from 'axios';
import { useAuthStore } from '../store/authStore';
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
              { headers: { 'x-backend': isStudent ? PORTAL_BACKEND.student : PORTAL_BACKEND.staff } },
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

attachTokenInterceptor(studentApi);
attachTokenInterceptor(staffApi);
attachTokenInterceptor(leaveApi);

export const getApiClient = (role) => {
  return role === 'student' ? studentApi : staffApi;
};
