import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000' });

client.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      const refreshed = await auth.refresh();
      if (refreshed) {
        error.config.headers.Authorization = `Bearer ${auth.accessToken}`;
        return client.request(error.config);
      }
      auth.logout();
    }
    return Promise.reject(error);
  },
);

export const api = {
  auth: {
    sendSms: (phone: string) => client.post('/auth/sms/send', { phone }),
    verifySms: (phone: string, otp: string) => client.post<{ accessToken: string; refreshToken: string }>('/auth/sms/verify', { phone, otp }),
    refresh: (refreshToken: string) => client.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
  },
  challenges: {
    create: (rawText: string, city: string) => client.post<{ id: string; budget: string }>('/challenges', { rawText, city }),
    get: (id: string) => client.get(`/challenges/${id}`),
    updateTask: (id: string, taskId: string, status: string) => client.patch(`/challenges/${id}/tasks/${taskId}`, { status }),
    complete: (id: string, savedAmount: number) => client.post(`/challenges/${id}/complete`, { savedAmount }),
    streamUrl: (id: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/challenges/${id}/stream`,
  },
  shops: {
    search: (city: string, params?: Record<string, string>) => client.get('/shops', { params: { city, ...params } }),
  },
  reports: {
    generate: (challengeId: string) => client.post<{ id: string; rankTitle: string; percentile: number; imageUrl: string }>('/reports', { challengeId }),
    get: (id: string) => client.get(`/reports/${id}`),
    imageUrl: (id: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/reports/${id}/image`,
  },
  leaderboard: {
    get: (city: string) => client.get('/leaderboard', { params: { city } }),
    cityStats: (city: string) => client.get('/stats/city', { params: { city } }),
    heatmap: (city: string) => client.get('/heatmap', { params: { city } }),
  },
};
