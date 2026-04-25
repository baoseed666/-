import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import router from '../router';

export interface ExchangeChannel {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  value: string;
  category: string;
  jumpUrl: string;
}

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
      router.push('/login');
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
    create: (rawText: string) => client.post<{ id: string; budget: string }>('/challenges', { rawText }),
    get: (id: string) => client.get(`/challenges/${id}`),
    updateTask: (id: string, taskId: string, status: string) => client.patch(`/challenges/${id}/tasks/${taskId}`, { status }),
    confirmPlan: (id: string, planIndex: number, lat?: number, lng?: number) => {
      const params: Record<string, string> = {};
      if (lat !== undefined) params.lat = String(lat);
      if (lng !== undefined) params.lng = String(lng);
      return client.post(`/challenges/${id}/confirm-plan`, { planIndex }, { params });
    },
    complete: (id: string, savedAmount: number) => client.post(`/challenges/${id}/complete`, { savedAmount }),
    streamUrl: (id: string, lat?: number, lng?: number) => {
      const base = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/challenges/${id}/stream`;
      const params = new URLSearchParams();
      if (lat !== undefined) params.set('lat', String(lat));
      if (lng !== undefined) params.set('lng', String(lng));
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },
  },
  shops: {
    search: (city: string, params?: Record<string, string>) => client.get('/shops', { params: { city, ...params } }),
    recommend: (params: {
      city: string;
      lat?: number;
      lng?: number;
      category?: string;
      budget?: number;
      discountTypes?: string;
      openNow?: boolean;
      limit?: number;
    }) => client.get('/shops/recommend', { params }),
  },
  reports: {
    generate: (challengeId: string) => client.post<{ id: string; rankTitle: string; percentile: number; imageUrl: string }>('/reports', { challengeId }),
    get: (id: string) => client.get(`/reports/${id}`),
    myStats: () => client.get('/reports/my-stats'),
    imageUrl: (id: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/reports/${id}/image`,
  },
  transit: {
    ipLocation: () => client.get<{ lat: number; lng: number; city: string; district: string }>('/transit/ip-location'),
  },
  leaderboard: {
    get: (city: string) => client.get('/leaderboard', { params: { city } }),
    cityStats: (city: string) => client.get('/stats/city', { params: { city } }),
    heatmap: (city: string) => client.get('/heatmap', { params: { city } }),
  },
  users: {
    getMe: () => client.get<{ id: string; nickname: string; avatarUrl: string | null; totalSaved: number; rankTitle: string; points: number }>('/users/me'),
    myChallenges: () => client.get<Array<{ id: string; inputText: string; status: string; savedAmount: number; pointsEarned: number; createdAt: string }>>('/users/me/challenges'),
    myPoints: () => client.get<{ points: number; channels: ExchangeChannel[] }>('/users/me/points'),
  },
  emotion: {
    checkin: (data: { locationName: string; lat: number; lng: number; emotionLabel: string }) =>
      client.post<{ pointsEarned: number }>('/emotion/checkin', data),
    myHistory: () => client.get('/emotion/my-history'),
    quizStreamUrl: () => `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/emotion/quiz`,
  },
  opc: {
    getTasks: (taskType?: string) => client.get('/opc/tasks', { params: taskType ? { taskType } : {} }),
    acceptTask: (id: string) => client.post(`/opc/tasks/${id}/accept`),
  },
};
