# 抠门大王 Plan D — 前端 + LBS + E2E测试

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现霓虹街机风 Vue3 H5 前端（Three.js 3D场景 + 完整游戏化UI）、LBS WebSocket拼单匹配，以及覆盖全链路的 Playwright E2E 测试（桌面 + 移动端）。

**Architecture:** Vue3 + Vite + TypeScript + TailwindCSS，Pinia管理状态，Three.js渲染首页3D场景，SSE接收AI流式任务，WebSocket处理LBS匹配。Playwright测试在真实浏览器中模拟完整用户操作，覆盖正常流程和边界场景。

**Tech Stack:** Vue3, Vite, TypeScript, TailwindCSS, Three.js, GSAP, Pinia, Vue Router, @vueuse/core, Playwright

**依赖：** Plan A（Auth API），Plan B（Shop API），Plan C（Challenge/Report/Leaderboard API）

---

### Task 11: 前端脚手架 + 设计系统

**Files:**
- Create: `D:/projects/抠门大王/frontend/` (完整 Vite 项目)
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/router/index.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/styles/globals.css`

- [ ] **Step 1: 创建前端项目**

```bash
cd D:/projects/抠门大王
npm create vue@latest frontend -- --typescript --router --pinia --eslint
cd frontend
npm install three @types/three gsap @vueuse/core axios
npm install -D @playwright/test tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Tailwind 配置（霓虹街机主题）**

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          black: '#0a0a0a',
          gold: '#ffdd00',
          green: '#00ff88',
          red: '#ff4444',
          blue: '#4488ff',
          dim: '#1a1a00',
          border: '#333300',
          muted: '#888844',
        },
      },
      fontFamily: { mono: ['Courier New', 'monospace'] },
      boxShadow: {
        gold: '0 0 12px rgba(255,221,0,0.4)',
        green: '0 0 12px rgba(0,255,136,0.4)',
        neon: '0 0 20px rgba(255,221,0,0.6), 0 0 40px rgba(255,221,0,0.2)',
      },
      animation: {
        'number-tick': 'numberTick 0.3s ease-out',
        'scanline': 'scanline 4s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        numberTick: { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 8px rgba(255,221,0,0.3)' }, '50%': { boxShadow: '0 0 24px rgba(255,221,0,0.8)' } },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: 全局样式**

```css
/* frontend/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-arcade-black text-white font-mono overflow-x-hidden;
  }

  /* CRT 扫描线效果 */
  body::after {
    content: '';
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
    pointer-events: none; z-index: 9999;
  }
}

@layer components {
  .btn-arcade {
    @apply px-6 py-3 border border-arcade-gold text-arcade-gold font-mono font-bold
           tracking-widest uppercase transition-all duration-200
           hover:bg-arcade-gold hover:text-arcade-black hover:shadow-neon
           active:scale-95;
  }

  .card-arcade {
    @apply bg-arcade-dim border border-arcade-border rounded p-4;
  }

  .task-badge-main  { @apply border-l-4 border-arcade-green; }
  .task-badge-side  { @apply border-l-4 border-arcade-gold; }
  .task-badge-hidden { @apply border-l-4 border-arcade-blue; }

  .hp-bar { @apply h-2 bg-arcade-red rounded-full transition-all duration-500; }
  .mp-bar { @apply h-2 bg-arcade-blue rounded-full transition-all duration-500; }
}
```

- [ ] **Step 4: API Client**

```typescript
// frontend/src/api/client.ts
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
```

- [ ] **Step 5: Router**

```typescript
// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/challenge/:id', component: () => import('../views/ChallengeView.vue'), meta: { requiresAuth: true } },
    { path: '/report/:id', component: () => import('../views/ReportView.vue'), meta: { requiresAuth: true } },
    { path: '/leaderboard', component: () => import('../views/LeaderboardView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login';
});

export default router;
```

- [ ] **Step 6: Auth Store**

```typescript
// frontend/src/stores/auth.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('accessToken'));
  const refreshToken = ref(localStorage.getItem('refreshToken'));
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
```

- [ ] **Step 7: Challenge Store（SSE + 任务状态）**

```typescript
// frontend/src/stores/challenge.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from './auth.store';

export const useChallengeStore = defineStore('challenge', () => {
  const current = ref<any>(null);
  const streaming = ref(false);
  const streamChunks = ref<string[]>([]);

  async function create(rawText: string, city: string) {
    const { data } = await api.challenges.create(rawText, city);
    return data;
  }

  async function startStream(challengeId: string, onChunk: (chunk: string) => void, onComplete: () => void) {
    streaming.value = true;
    streamChunks.value = [];
    const auth = useAuthStore();
    const url = api.challenges.streamUrl(challengeId);

    const es = new EventSource(`${url}?token=${auth.accessToken}`);
    es.addEventListener('task_chunk', (e) => {
      const { chunk } = JSON.parse(e.data);
      streamChunks.value.push(chunk);
      onChunk(chunk);
    });
    es.addEventListener('complete', () => {
      streaming.value = false;
      es.close();
      onComplete();
    });
    es.onerror = () => { streaming.value = false; es.close(); };
  }

  async function load(id: string) {
    const { data } = await api.challenges.get(id);
    current.value = data;
    return data;
  }

  async function updateTask(challengeId: string, taskId: string, status: string) {
    await api.challenges.updateTask(challengeId, taskId, status);
    await load(challengeId);
  }

  async function complete(challengeId: string, savedAmount: number) {
    const { data } = await api.challenges.complete(challengeId, savedAmount);
    return data;
  }

  return { current, streaming, streamChunks, create, startStream, load, updateTask, complete };
});
```

- [ ] **Step 8: Commit**

```bash
cd D:/projects/抠门大王
git add frontend/
git commit -m "feat: frontend scaffold — neon arcade theme, stores, router, api client"
```

---

### Task 12: 核心页面实现

**Files:**
- Create: `frontend/src/views/LoginView.vue`
- Create: `frontend/src/views/HomeView.vue`
- Create: `frontend/src/components/three/SceneCanvas.vue`
- Create: `frontend/src/views/ChallengeView.vue`
- Create: `frontend/src/components/challenge/TaskCard.vue`
- Create: `frontend/src/components/challenge/HPMPBar.vue`
- Create: `frontend/src/views/ReportView.vue`
- Create: `frontend/src/views/LeaderboardView.vue`

- [ ] **Step 1: LoginView**

```vue
<!-- frontend/src/views/LoginView.vue -->
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
  await auth.sendSms(phone.value);
  countdown.value = 60;
  const t = setInterval(() => { if (--countdown.value <= 0) clearInterval(t); }, 1000);
}

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(phone.value, otp.value);
    router.push('/');
  } catch { error.value = '验证码错误，请重试'; }
  finally { loading.value = false; }
}
</script>
```

- [ ] **Step 2: Three.js Scene（首页 3D 背景）**

```vue
<!-- frontend/src/components/three/SceneCanvas.vue -->
<template>
  <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { gsap } from 'gsap';

const canvasRef = ref<HTMLCanvasElement>();
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera;
let animId: number;

onMounted(() => {
  const canvas = canvasRef.value!;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.z = 3;

  // 金色粒子场
  const geo = new THREE.BufferGeometry();
  const count = 800;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 10;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffdd00, size: 0.015, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));

  // 霓虹环
  const ringGeo = new THREE.TorusGeometry(1.5, 0.005, 8, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring);
  gsap.to(ring.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });

  const animate = () => {
    animId = requestAnimationFrame(animate);
    const pts = scene.children[0] as THREE.Points;
    pts.rotation.y += 0.0003;
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };
  window.addEventListener('resize', onResize);
  onUnmounted(() => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); renderer.dispose(); });
});
</script>
```

- [ ] **Step 3: HomeView（挑战输入）**

```vue
<!-- frontend/src/views/HomeView.vue -->
<template>
  <div class="relative min-h-screen overflow-hidden">
    <SceneCanvas class="z-0" />

    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-arcade-gold tracking-widest mb-2">抠门大王</h1>
        <p class="text-arcade-muted tracking-widest text-sm">当 AI 都在推荐你买什么，我们教你怎么不买</p>
      </div>

      <!-- 城市统计 -->
      <div v-if="cityStats" class="text-xs text-arcade-muted text-center mb-6">
        今晚{{ selectedCity }}已有 <span class="text-arcade-gold">{{ cityStats.todayCount }}</span> 人省下
        <span class="text-arcade-green">¥{{ cityStats.todayTotalSaved.toFixed(0) }}</span>
      </div>

      <div class="w-full max-w-md card-arcade space-y-4">
        <!-- 城市选择 -->
        <select v-model="selectedCity"
          class="w-full bg-arcade-dim border border-arcade-border rounded px-3 py-2 text-arcade-gold focus:border-arcade-gold focus:outline-none">
          <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
        </select>

        <!-- 挑战输入 -->
        <textarea v-model="inputText" rows="3" placeholder="今晚烧烤，预算30，2人..."
          class="w-full bg-transparent border border-arcade-border rounded px-3 py-2 text-white placeholder-arcade-muted resize-none focus:border-arcade-gold focus:outline-none transition-colors" />

        <button @click="startChallenge" :disabled="loading || !inputText.trim()" class="btn-arcade w-full justify-center text-lg">
          {{ loading ? '⚡ AI正在谋划...' : '⚔️ 发起省钱挑战' }}
        </button>

        <p v-if="error" class="text-arcade-red text-xs text-center">{{ error }}</p>
      </div>

      <!-- 导航 -->
      <div class="flex gap-4 mt-6">
        <router-link to="/leaderboard" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">🏆 排行榜</router-link>
        <router-link to="/profile" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">👤 我的</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChallengeStore } from '../stores/challenge.store';
import { api } from '../api/client';
import SceneCanvas from '../components/three/SceneCanvas.vue';

const router = useRouter();
const challenge = useChallengeStore();
const inputText = ref('');
const selectedCity = ref('上海');
const loading = ref(false);
const error = ref('');
const cityStats = ref<any>(null);
const cities = ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '西安'];

onMounted(async () => {
  try { cityStats.value = (await api.leaderboard.cityStats(selectedCity.value)).data; } catch {}
});

async function startChallenge() {
  error.value = '';
  loading.value = true;
  try {
    const { id } = (await challenge.create(inputText.value, selectedCity.value));
    router.push(`/challenge/${id}`);
  } catch (e: any) { error.value = e.response?.data?.message ?? '创建失败，请重试'; }
  finally { loading.value = false; }
}
</script>
```

- [ ] **Step 4: HPMPBar 组件**

```vue
<!-- frontend/src/components/challenge/HPMPBar.vue -->
<template>
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <span class="text-arcade-red text-xs tracking-widest">HP ¥{{ current.toFixed(0) }} / ¥{{ max.toFixed(0) }}</span>
      <span class="text-arcade-blue text-xs tracking-widest">MP × {{ mp }}</span>
    </div>
    <div class="bg-arcade-border rounded h-2">
      <div class="hp-bar" :style="{ width: `${Math.min(100, (current / max) * 100)}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ current: number; max: number; mp: number }>();
</script>
```

- [ ] **Step 5: TaskCard 组件**

```vue
<!-- frontend/src/components/challenge/TaskCard.vue -->
<template>
  <div :class="['card-arcade task-badge-' + task.type, 'transition-all duration-300', task.status === 'done' ? 'opacity-60' : '']">
    <div class="flex justify-between items-start mb-2">
      <div>
        <span :class="badgeClass" class="text-xs tracking-widest px-2 py-0.5 rounded border">{{ typeLabel }}</span>
      </div>
      <button v-if="task.status === 'pending'" @click="$emit('complete', task.id)"
        class="text-xs text-arcade-green border border-arcade-green px-2 py-0.5 rounded hover:bg-arcade-green hover:text-arcade-black transition-colors">
        ✓ 完成
      </button>
      <span v-else class="text-xs text-arcade-muted">{{ task.status === 'done' ? '✓ 已完成' : '跳过' }}</span>
    </div>
    <p class="text-sm text-white mb-2">{{ task.description }}</p>
    <ul v-if="task.tips.length" class="space-y-1">
      <li v-for="tip in task.tips" :key="tip" class="text-xs text-arcade-muted flex gap-1">
        <span class="text-arcade-gold">›</span> {{ tip }}
      </li>
    </ul>
    <p v-if="task.shop?.name" class="text-xs text-arcade-green mt-2">📍 {{ task.shop.name }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ task: any }>();
defineEmits<{ (e: 'complete', id: string): void }>();

const typeLabel = computed(() => ({ main: '🎯 主线任务', side: '⚡ 支线任务', hidden: '🏆 隐藏成就' }[props.task.type]));
const badgeClass = computed(() => ({ main: 'border-arcade-green text-arcade-green', side: 'border-arcade-gold text-arcade-gold', hidden: 'border-arcade-blue text-arcade-blue' }[props.task.type]));
</script>
```

- [ ] **Step 6: ChallengeView（任务面板 + SSE）**

```vue
<!-- frontend/src/views/ChallengeView.vue -->
<template>
  <div class="min-h-screen px-4 pt-6 pb-24 max-w-lg mx-auto">
    <!-- 头部 -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">省钱挑战</h2>
    </div>

    <!-- HP/MP -->
    <HPMPBar v-if="challenge" :current="parseFloat(challenge.budget)" :max="parseFloat(challenge.budget)" :mp="3" class="mb-4" />

    <!-- 流式加载状态 -->
    <div v-if="streaming" class="card-arcade mb-4 text-center">
      <p class="text-arcade-gold text-sm animate-pulse">⚡ AI 正在谋划省钱方案...</p>
      <p class="text-arcade-muted text-xs mt-1">{{ streamBuffer.length }} 字符已接收</p>
    </div>

    <!-- 任务卡片 -->
    <div v-if="challenge?.tasks?.length" class="space-y-3">
      <TaskCard v-for="task in challenge.tasks" :key="task.id" :task="task" @complete="completeTask(task.id)" />
    </div>

    <!-- 完成按钮 -->
    <div v-if="challenge?.tasks?.length && !streaming" class="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
      <button @click="showCompleteModal = true" class="btn-arcade w-full justify-center text-lg">
        🏆 完成挑战，生成战报
      </button>
    </div>

    <!-- 完成确认弹窗 -->
    <div v-if="showCompleteModal" class="fixed inset-0 bg-black/80 flex items-center justify-center px-6 z-50">
      <div class="card-arcade w-full max-w-sm space-y-4">
        <h3 class="text-arcade-gold font-bold">确认完成挑战</h3>
        <div>
          <label class="text-arcade-muted text-xs">实际省下多少钱（元）</label>
          <input v-model.number="savedAmount" type="number" min="0"
            class="w-full bg-transparent border border-arcade-border rounded px-3 py-2 text-white mt-1 focus:border-arcade-gold focus:outline-none" />
        </div>
        <div class="flex gap-3">
          <button @click="showCompleteModal = false" class="flex-1 btn-arcade text-sm">取消</button>
          <button @click="handleComplete" class="flex-1 btn-arcade text-sm bg-arcade-gold text-arcade-black">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChallengeStore } from '../stores/challenge.store';
// TaskStatus mirrors backend enum — no cross-project imports
const TaskStatus = { DONE: 'done', PENDING: 'pending', SKIPPED: 'skipped' } as const;
import HPMPBar from '../components/challenge/HPMPBar.vue';
import TaskCard from '../components/challenge/TaskCard.vue';

const route = useRoute();
const router = useRouter();
const store = useChallengeStore();
const challenge = ref<any>(null);
const streaming = ref(false);
const streamBuffer = ref('');
const showCompleteModal = ref(false);
const savedAmount = ref(0);

onMounted(async () => {
  const id = route.params.id as string;
  challenge.value = await store.load(id);

  if (!challenge.value.tasks?.length) {
    streaming.value = true;
    await store.startStream(
      id,
      (chunk) => { streamBuffer.value += chunk; },
      async () => { streaming.value = false; challenge.value = await store.load(id); },
    );
  }
});

async function completeTask(taskId: string) {
  await store.updateTask(challenge.value.id, taskId, 'done');
  challenge.value = await store.load(challenge.value.id);
}

async function handleComplete() {
  await store.complete(challenge.value.id, savedAmount.value);   // marks challenge completed
  const { data: report } = await api.reports.generate(challenge.value.id);
  router.push(`/report/${report.id}`);
}
</script>
```

- [ ] **Step 7: ReportView（战报页）**

```vue
<!-- frontend/src/views/ReportView.vue -->
<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
    <div v-if="report" class="w-full max-w-sm space-y-6">
      <!-- 标题 -->
      <div class="text-center">
        <p class="text-arcade-muted text-xs tracking-widest mb-2">BATTLE REPORT</p>
        <h1 class="text-2xl font-bold text-arcade-gold">【{{ report.rankTitle }}】</h1>
        <p class="text-5xl font-bold text-white mt-4">¥{{ report.challenge.savedAmount }}</p>
        <p class="text-arcade-muted text-sm">成功省下</p>
      </div>

      <!-- 数据 -->
      <div class="card-arcade grid grid-cols-3 gap-4 text-center">
        <div><p class="text-arcade-red text-lg font-bold">{{ report.challenge.budget }}</p><p class="text-arcade-muted text-xs">HP预算</p></div>
        <div><p class="text-arcade-green text-lg font-bold">{{ report.percentile }}%</p><p class="text-arcade-muted text-xs">击败用户</p></div>
        <div><p class="text-arcade-blue text-lg font-bold">×3</p><p class="text-arcade-muted text-xs">技能</p></div>
      </div>

      <!-- 战报 -->
      <div class="card-arcade">
        <p class="text-white text-center">{{ report.headline }}</p>
      </div>

      <!-- 海报预览 -->
      <img v-if="report.imageUrl" :src="imageUrl" class="w-full rounded border border-arcade-border" alt="战报海报" />

      <!-- 操作 -->
      <div class="flex gap-3">
        <button @click="download" class="btn-arcade flex-1 justify-center text-sm">⬇ 保存海报</button>
        <router-link to="/" class="btn-arcade flex-1 justify-center text-sm text-center">⚔️ 再战一局</router-link>
      </div>
    </div>

    <div v-else class="text-arcade-muted">加载战报中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/client';

const route = useRoute();
const report = ref<any>(null);
const imageUrl = computed(() => report.value ? api.reports.imageUrl(report.value.id) : '');

onMounted(async () => {
  report.value = (await api.reports.get(route.params.id as string)).data;
});

function download() {
  const a = document.createElement('a');
  a.href = imageUrl.value; a.download = 'battle-report.png'; a.click();
}
</script>
```

- [ ] **Step 8: LeaderboardView**

```vue
<!-- frontend/src/views/LeaderboardView.vue -->
<template>
  <div class="min-h-screen px-4 pt-6 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">🏆 省钱排行榜</h2>
    </div>

    <!-- 城市统计 -->
    <div v-if="stats" class="card-arcade mb-6 text-center">
      <p class="text-arcade-muted text-xs">今日 {{ stats.city }}</p>
      <p class="text-2xl text-arcade-gold font-bold">{{ stats.todayCount }} 人省下 ¥{{ stats.todayTotalSaved.toFixed(0) }}</p>
    </div>

    <!-- 排行 -->
    <div class="space-y-2">
      <div v-for="(u, i) in leaderboard" :key="u.id" class="card-arcade flex items-center gap-3">
        <span :class="['text-lg font-bold w-8 text-center', i < 3 ? 'text-arcade-gold' : 'text-arcade-muted']">#{{ i + 1 }}</span>
        <div class="flex-1">
          <p class="text-white text-sm">{{ u.nickname }}</p>
          <p class="text-arcade-muted text-xs">{{ u.rankTitle }}</p>
        </div>
        <p class="text-arcade-green font-bold">¥{{ parseFloat(u.totalSaved).toFixed(0) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';

const leaderboard = ref<any[]>([]);
const stats = ref<any>(null);

onMounted(async () => {
  const city = '上海';
  [leaderboard.value, stats.value] = await Promise.all([
    api.leaderboard.get(city).then((r) => r.data),
    api.leaderboard.cityStats(city).then((r) => r.data),
  ]);
});
</script>
```

- [ ] **Step 9: 启动前端开发服务器，目视验证所有页面**

```bash
cd frontend && npm run dev
```

用浏览器访问 http://localhost:5173，逐页检查：
- `/login` — 手机号输入框 + 验证码
- `/` — Three.js 3D背景 + 输入框
- `/challenge/xxx` — 任务卡片（需手动创建一个挑战）
- `/leaderboard` — 排行榜

- [ ] **Step 10: Commit**

```bash
cd D:/projects/抠门大王
git add frontend/src/
git commit -m "feat: frontend views — neon arcade UI, Three.js scene, SSE task streaming"
```

---

### Task 13: LBSModule（WebSocket 拼单匹配）

**Files:**
- Create: `backend/src/lbs/lbs.module.ts`
- Create: `backend/src/lbs/lbs.service.ts`
- Create: `backend/src/lbs/lbs.controller.ts`
- Create: `backend/src/lbs/lbs.gateway.ts`
- Create: `frontend/src/stores/lbs.store.ts`
- Create: `frontend/src/components/LBSMatcher.vue`

- [ ] **Step 1: LBS Gateway（WebSocket）**

```typescript
// backend/src/lbs/lbs.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { LbsService } from './lbs.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/lbs' })
export class LbsGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly lbs: LbsService) {}

  @SubscribeMessage('request-match')
  async handleRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; lat: number; lng: number; tags: string[]; shopId?: string },
  ) {
    await this.lbs.joinMatchPool(data.userId, data.lat, data.lng, data.tags, client.id, data.shopId);
    const match = await this.lbs.findMatch(data.userId, data.lat, data.lng, data.tags);

    if (match) {
      // 通知双方
      this.server.to(match.requesterSocketId).emit('matched', { matchedUserId: data.userId });
      client.emit('matched', { matchedUserId: match.userId });
      await this.lbs.confirmMatch(data.userId, match.userId);
    } else {
      client.emit('waiting', { message: '正在寻找附近的省钱伙伴...' });
    }
  }

  @SubscribeMessage('cancel-match')
  async handleCancel(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    await this.lbs.cancelRequest(data.userId);
    client.emit('cancelled', {});
  }
}
```

- [ ] **Step 2: LBS Service**

```typescript
// backend/src/lbs/lbs.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LbsRequest, LbsStatus } from './lbs-request.entity';

const MATCH_RADIUS_KM = 0.1; // 100m

@Injectable()
export class LbsService {
  // userId → socketId mapping (in-memory, short-lived)
  private readonly socketMap = new Map<string, string>();

  constructor(@InjectRepository(LbsRequest) private readonly repo: Repository<LbsRequest>) {}

  async joinMatchPool(userId: string, lat: number, lng: number, tags: string[], socketId: string, shopId?: string) {
    this.socketMap.set(userId, socketId);
    await this.repo.upsert(
      {
        user: { id: userId } as any,
        shop: shopId ? { id: shopId } as any : null,
        lat, lng, tags,
        status: LbsStatus.WAITING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟过期
      },
      { conflictPaths: ['user'] as any },
    );
  }

  async findMatch(userId: string, lat: number, lng: number, tags: string[]): Promise<{ userId: string; requesterSocketId: string } | null> {
    const candidates = await this.repo.find({
      where: { status: LbsStatus.WAITING, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });

    for (const c of candidates) {
      if (c.user.id === userId) continue;
      const dist = this.haversine(lat, lng, c.lat, c.lng);
      const hasCommonTag = tags.some((t) => c.tags.includes(t));
      if (dist <= MATCH_RADIUS_KM && hasCommonTag) {
        return { userId: c.user.id, requesterSocketId: this.socketMap.get(c.user.id) ?? '' };
      }
    }
    return null;
  }

  async confirmMatch(userId1: string, userId2: string) {
    await this.repo.update({ user: { id: userId1 } as any }, { status: LbsStatus.MATCHED, matchedUserId: userId2 });
    await this.repo.update({ user: { id: userId2 } as any }, { status: LbsStatus.MATCHED, matchedUserId: userId1 });
  }

  async cancelRequest(userId: string) {
    await this.repo.delete({ user: { id: userId } as any });
    this.socketMap.delete(userId);
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) { return deg * (Math.PI / 180); }
}
```

- [ ] **Step 3: LBS Store（前端）**

```typescript
// frontend/src/stores/lbs.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';

export const useLBSStore = defineStore('lbs', () => {
  const socket = ref<Socket | null>(null);
  const status = ref<'idle' | 'waiting' | 'matched'>('idle');
  const matchedUserId = ref<string | null>(null);

  function connect() {
    socket.value = io(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/lbs`);
    socket.value.on('matched', (data) => { status.value = 'matched'; matchedUserId.value = data.matchedUserId; });
    socket.value.on('waiting', () => { status.value = 'waiting'; });
    socket.value.on('cancelled', () => { status.value = 'idle'; });
  }

  function requestMatch(userId: string, lat: number, lng: number, tags: string[], shopId?: string) {
    if (!socket.value) connect();
    status.value = 'waiting';
    socket.value!.emit('request-match', { userId, lat, lng, tags, shopId });
  }

  function cancel(userId: string) {
    socket.value?.emit('cancel-match', { userId });
    status.value = 'idle';
  }

  return { status, matchedUserId, requestMatch, cancel };
});
```

- [ ] **Step 4: LbsModule + 更新 AppModule**

```typescript
// backend/src/lbs/lbs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LbsRequest } from './lbs-request.entity';
import { LbsGateway } from './lbs.gateway';
import { LbsService } from './lbs.service';

@Module({
  imports: [TypeOrmModule.forFeature([LbsRequest])],
  providers: [LbsGateway, LbsService],
})
export class LbsModule {}
```

在 `backend/src/app.module.ts` 追加 `LbsModule`：

```typescript
import { LbsModule } from './lbs/lbs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule, UsersModule, AuthModule, AdminModule,
    ShopsModule, ChallengesModule, LeaderboardModule, BattleReportsModule,
    LbsModule,
  ],
})
export class AppModule {}
```

同时在 `backend/src/main.ts` 启用 Socket.IO：

```typescript
// backend/src/main.ts — 追加
import { IoAdapter } from '@nestjs/platform-socket.io';
// 在 bootstrap() 中 app.listen() 之前：
app.useWebSocketAdapter(new IoAdapter(app));
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/lbs/ frontend/src/stores/lbs.store.ts
git commit -m "feat: LBS module — WebSocket matching, 100m radius, Haversine distance"
```

---

### Task 14: Playwright E2E 全链路测试

**Files:**
- Create: `frontend/e2e/auth.spec.ts`
- Create: `frontend/e2e/challenge.spec.ts`
- Create: `frontend/e2e/report.spec.ts`
- Create: `frontend/e2e/leaderboard.spec.ts`
- Create: `frontend/playwright.config.ts`

- [ ] **Step 1: Playwright 配置（桌面 + 移动端双设备）**

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile iPhone 14', use: { ...devices['iPhone 14'] } },
    { name: 'Mobile Pixel 7', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Auth E2E 测试（登录全流程）**

```typescript
// frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  // 正常场景：完整登录流程
  test('手机号+验证码完整登录', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('抠门大王');

    // 输入手机号
    await page.fill('input[type="tel"]', '13800138000');

    // 点击获取验证码
    await page.click('button:has-text("获取验证码")');
    await expect(page.locator('button:has-text("60s")')).toBeVisible();

    // 输入验证码
    await page.fill('input[maxlength="6"]', '123456');

    // 登录
    await page.click('button:has-text("开始挑战")');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');

    // 验证首页已加载
    await expect(page.locator('text=发起省钱挑战')).toBeVisible();
  });

  // 边界场景：手机号格式错误
  test('手机号格式错误 → 提示错误', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '1234');
    await page.click('button:has-text("获取验证码")');
    await expect(page.locator('text=手机号格式错误')).toBeVisible();
  });

  // 边界场景：验证码错误
  test('错误验证码 → 提示验证码错误', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '13800138001');
    await page.click('button:has-text("获取验证码")');
    await page.fill('input[maxlength="6"]', '000000');
    await page.click('button:has-text("开始挑战")');
    await expect(page.locator('text=验证码错误')).toBeVisible();
  });

  // 边界场景：未登录访问受保护页面 → 重定向到登录
  test('未登录访问 /leaderboard → 重定向到 /login', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});
```

- [ ] **Step 3: Challenge 全链路 E2E**

```typescript
// frontend/e2e/challenge.spec.ts
import { test, expect, Page } from '@playwright/test';

async function login(page: Page, phone = '13999990001') {
  await page.goto('/login');
  await page.fill('input[type="tel"]', phone);
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
}

test.describe('挑战全链路', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  // 正常场景：完整挑战流程
  test('创建挑战 → AI流式生成任务 → 完成任务 → 生成战报', async ({ page }) => {
    // 1. 首页输入挑战
    await page.fill('textarea', '今晚烧烤，预算30，2人');
    await page.selectOption('select', '上海');
    await page.click('button:has-text("发起省钱挑战")');

    // 2. 等待跳转到挑战页
    await page.waitForURL(/\/challenge\/.+/);
    await expect(page.locator('text=省钱挑战')).toBeVisible();

    // 3. 等待 AI 流式生成完成
    await page.waitForSelector('.task-badge-main', { timeout: 60000 });
    await expect(page.locator('.task-badge-main')).toBeVisible();
    await expect(page.locator('.task-badge-side')).toBeVisible();
    await expect(page.locator('.task-badge-hidden')).toBeVisible();

    // 4. 检查任务内容不含违禁词
    const pageText = await page.locator('body').textContent();
    expect(pageText).not.toContain('垃圾桶');
    expect(pageText).not.toContain('乞讨');

    // 5. 完成一个任务
    await page.click('button:has-text("✓ 完成")');
    await expect(page.locator('text=已完成').first()).toBeVisible();

    // 6. 点击完成挑战
    await page.click('button:has-text("完成挑战，生成战报")');

    // 7. 弹窗：输入省下金额
    await expect(page.locator('text=确认完成挑战')).toBeVisible();
    await page.fill('input[type="number"]', '12');
    await page.click('button:has-text("确认")');

    // 8. 跳转到战报页
    await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
    await expect(page.locator('text=成功省下')).toBeVisible();
  }, 120000);

  // 复杂场景：3人高预算聚餐（测试 AI 决策能力极限）
  test('3人火锅150元 → AI应生成叠加优惠方案', async ({ page }) => {
    await page.fill('textarea', '3人聚餐，预算150元，想吃火锅，徐汇区，要求评分4.5以上');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForSelector('.task-badge-main', { timeout: 60000 });

    // 验证任务描述中包含省钱相关词汇
    const taskTexts = await page.locator('.card-arcade p').allTextContents();
    const savingKeywords = ['优惠', '团购', '折扣', '省', '满减', '券', '套餐'];
    const hasSavingContent = taskTexts.some((t) => savingKeywords.some((k) => t.includes(k)));
    expect(hasSavingContent).toBe(true);
  }, 90000);

  // 边界场景：空输入
  test('空输入 → 按钮禁用', async ({ page }) => {
    await expect(page.locator('button:has-text("发起省钱挑战")')).toBeDisabled();
  });

  // 边界场景：极小预算（1元）
  test('预算1元 → AI仍能生成方案（不崩溃）', async ({ page }) => {
    await page.fill('textarea', '预算1元，随便');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    // 不崩溃，显示某种内容
    await page.waitForTimeout(5000);
    await expect(page.locator('text=省钱挑战')).toBeVisible();
  }, 30000);
});
```

- [ ] **Step 4: Report + Leaderboard E2E**

```typescript
// frontend/e2e/report.spec.ts
import { test, expect, Page } from '@playwright/test';

async function loginAndComplete(page: Page) {
  // 登录
  await page.goto('/login');
  await page.fill('input[type="tel"]', '13888880001');
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
  // 创建并完成挑战
  await page.fill('textarea', '预算50元，烧烤');
  await page.click('button:has-text("发起省钱挑战")');
  await page.waitForURL(/\/challenge\/.+/);
  await page.waitForSelector('.task-badge-main', { timeout: 60000 });
  await page.click('button:has-text("完成挑战，生成战报")');
  await page.fill('input[type="number"]', '15');
  await page.click('button:has-text("确认")');
  await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
}

test.describe('战报页', () => {
  test('战报展示完整信息：称号 + 省钱金额 + 击败比例', async ({ page }) => {
    await loginAndComplete(page);
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
    await expect(page.locator('text=成功省下')).toBeVisible();
    // 称号
    await expect(page.locator('text=【')).toBeVisible();
    // 击败比例
    await expect(page.locator('text=%')).toBeVisible();
  }, 120000);

  test('海报图片可访问', async ({ page }) => {
    await loginAndComplete(page);
    const img = page.locator('img[alt="战报海报"]');
    await expect(img).toBeVisible({ timeout: 10000 });
    const src = await img.getAttribute('src');
    expect(src).toMatch(/\/uploads\/reports\/.+\.png/);
  }, 120000);

  test('保存海报按钮可点击', async ({ page }) => {
    await loginAndComplete(page);
    await expect(page.locator('button:has-text("保存海报")')).toBeVisible();
    await page.click('button:has-text("保存海报")');
    // 验证未报错
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
  }, 120000);
});

// frontend/e2e/leaderboard.spec.ts
test.describe('排行榜', () => {
  test('排行榜显示城市统计 + 用户列表', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '13777770001');
    await page.click('button:has-text("获取验证码")');
    await page.fill('input[maxlength="6"]', '123456');
    await page.click('button:has-text("开始挑战")');
    await page.waitForURL('/');
    await page.click('text=排行榜');
    await page.waitForURL('/leaderboard');
    await expect(page.locator('text=省钱排行榜')).toBeVisible();
    await expect(page.locator('text=今日')).toBeVisible();
  });
});
```

- [ ] **Step 5: 安装 Playwright 浏览器**

```bash
cd frontend && npx playwright install chromium webkit
```

- [ ] **Step 6: 运行 E2E 测试（桌面 + 移动端）**

```bash
# 确保后端和前端都在运行
# 终端1: cd backend && npm run start:dev
# 终端2: cd frontend && npm run dev
# 终端3:
cd frontend && npx playwright test --reporter=html
```

Expected: 全部测试通过，生成 HTML 报告

- [ ] **Step 7: 查看测试报告**

```bash
npx playwright show-report
```

检查每个测试的截图，确认：
- 所有按钮文字正确
- 任务卡片样式与霓虹街机主题一致
- AI 生成内容语言准确（中文，无乱码）
- 移动端布局不溢出

- [ ] **Step 8: Commit**

```bash
cd D:/projects/抠门大王
git add frontend/e2e/ frontend/playwright.config.ts
git commit -m "test: playwright e2e — full chain desktop+mobile, normal+boundary scenarios"
```

---

## Plan D 完成标准

- [ ] 前端所有 6 个页面正常渲染（Login, Home, Challenge, Report, Leaderboard, Profile）
- [ ] Three.js 3D 场景在首页正常运行，无 WebGL 报错
- [ ] SSE 任务流在 ChallengeView 逐条渲染
- [ ] LBS WebSocket 匹配逻辑通过（同局域网两个浏览器 Tab 模拟）
- [ ] Playwright 桌面端 + 移动端全部测试 PASS
- [ ] Git 4 个原子提交
