import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getStudentApiBaseUrl, getStaffApiBaseUrl } from './ApiConfig';

const STUDENT_BASE_URL = getStudentApiBaseUrl();
const STAFF_BASE_URL = getStaffApiBaseUrl();

export const studentApi = axios.create({
  baseURL: STUDENT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const staffApi = axios.create({
  baseURL: STAFF_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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
            const refreshEndpoint = isStudent
              ? `${STUDENT_BASE_URL}/auth/refresh`
              : `${STAFF_BASE_URL}/auth/refresh`;

            const res = await axios.post(refreshEndpoint, { refreshToken });
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

export const getApiClient = (role) => {
  return role === 'student' ? studentApi : staffApi;
};
