import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const user = ref<{ id: string; nickname: string; rankTitle: string; totalSaved: number } | null>(null);

  const isLoggedIn = computed(() => !!accessToken.value);

  async function sendSms(phone: string) { await api.auth.sendSms(phone); }

  async function login(phone: string, otp: string) {
    const { data } = await api.auth.verifySms(phone, otp);
    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false;
    try {
      const { data } = await api.auth.refresh(refreshToken.value);
      accessToken.value = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch { logout(); return false; }
  }

  function logout() {
    accessToken.value = null; refreshToken.value = null; user.value = null;
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
  }

  return { accessToken, refreshToken, user, isLoggedIn, sendSms, login, refresh, logout };
});
