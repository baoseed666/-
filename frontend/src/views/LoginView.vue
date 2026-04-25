<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6">
    <div class="w-full max-w-sm">
      <h1 class="text-4xl font-bold text-arcade-gold text-center mb-2 tracking-widest">抠门大王</h1>
      <p class="text-arcade-muted text-center text-sm mb-8 tracking-wider">MISER KING · 省钱是一种态度</p>

      <div class="card-arcade space-y-4">
        <div>
          <label class="text-arcade-muted text-xs tracking-widest block mb-1">手机号</label>
          <input v-model="phone" type="tel" maxlength="11" placeholder="13800138000"
            class="w-full bg-transparent border border-arcade-border rounded px-3 py-2 text-white placeholder-arcade-muted focus:border-arcade-gold focus:outline-none transition-colors" />
        </div>

        <div class="flex gap-2">
          <input v-model="otp" type="text" maxlength="6" placeholder="验证码"
            class="flex-1 bg-transparent border border-arcade-border rounded px-3 py-2 text-white placeholder-arcade-muted focus:border-arcade-gold focus:outline-none transition-colors" />
          <button @click="sendCode" :disabled="countdown > 0" class="btn-arcade text-sm px-4 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>

        <button @click="handleLogin" :disabled="loading" class="btn-arcade w-full justify-center">
          {{ loading ? '登录中...' : '▶ 开始挑战' }}
        </button>

        <p v-if="error" class="text-arcade-red text-xs text-center">{{ error }}</p>
      </div>

      <p class="text-arcade-muted text-xs text-center mt-4">Demo模式：验证码固定 123456</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const phone = ref('');
const otp = ref('');
const loading = ref(false);
const error = ref('');
const countdown = ref(0);

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '手机号格式错误'; return; }
  error.value = '';
  try {
    await auth.sendSms(phone.value);
    countdown.value = 60;
    const t = setInterval(() => { if (--countdown.value <= 0) clearInterval(t); }, 1000);
  } catch (e: any) {
    error.value = e?.code === 'ERR_NETWORK' ? '无法连接服务器，请先启动后端（npm run start:dev）' : '发送失败，请重试';
  }
}

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(phone.value, otp.value);
    await router.push('/');
  } catch (e: any) {
    error.value = e?.code === 'ERR_NETWORK'
      ? '无法连接服务器，请先启动后端（npm run start:dev）'
      : (e?.response?.data?.message ?? '验证码错误，请重试');
  } finally { loading.value = false; }
}
</script>
