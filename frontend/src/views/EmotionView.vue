<template>
  <div class="min-h-screen px-4 pt-6 pb-16 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">🎭 情绪探索</h2>
    </div>

    <!-- Mode select phase -->
    <div v-if="phase === 'mode-select'" class="space-y-6">
      <div class="text-center space-y-1 mb-8">
        <p class="text-arcade-gold text-xl font-bold tracking-widest">🎭 省钱人格 SQTI</p>
        <p class="text-arcade-muted text-sm">解锁你的情绪消费密码</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <button
          @click="selectMode('quick')"
          class="card-arcade flex flex-col gap-3 text-left hover:border-arcade-gold/60 transition-colors cursor-pointer"
        >
          <p class="text-2xl">⚡</p>
          <p class="text-white font-bold text-sm">快速版 5题</p>
          <p class="text-arcade-muted text-xs leading-relaxed">回答5题，2分钟完成</p>
          <p class="text-arcade-muted text-xs">结果包含 3 条场景路线</p>
        </button>
        <button
          @click="selectMode('deep')"
          class="card-arcade flex flex-col gap-3 text-left hover:border-arcade-gold/60 transition-colors cursor-pointer"
        >
          <p class="text-2xl">🧬</p>
          <p class="text-white font-bold text-sm">深度版 12题</p>
          <p class="text-arcade-muted text-xs leading-relaxed">回答12题，解锁更精准的情绪路线</p>
          <p class="text-arcade-muted text-xs">结果包含 5 条路线 + 详细SQTI分析</p>
        </button>
      </div>
    </div>

    <!-- Quiz phase -->
    <div v-else-if="phase === 'quiz'" class="space-y-5">
      <div class="flex items-center justify-between">
        <p class="text-arcade-muted text-sm">{{ mode === 'deep' ? '🧬 深度版' : '⚡ 快速版' }}</p>
        <p class="text-arcade-gold text-sm font-mono">{{ answerCount }}/{{ questions.length }}</p>
      </div>

      <div v-for="(q, qi) in questions" :key="q.id" class="card-arcade">
        <p class="text-white text-sm font-semibold mb-3">{{ qi + 1 }}. {{ q.text }}</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="opt in q.options"
            :key="opt"
            @click="answers[qi] = opt"
            :class="[
              'text-xs py-2 px-3 rounded border transition-colors text-left',
              answers[qi] === opt
                ? 'border-arcade-gold bg-arcade-gold/10 text-arcade-gold'
                : 'border-arcade-border text-arcade-muted hover:border-arcade-gold/50'
            ]"
          >{{ opt }}</button>
        </div>
      </div>

      <button
        @click="startAnalysis"
        :disabled="answerCount < questions.length"
        class="btn-arcade w-full justify-center text-base"
      >
        {{ answerCount < questions.length
          ? `还差 ${questions.length - answerCount} 题`
          : '🔮 开始情绪分析' }}
      </button>
    </div>

    <!-- Analyzing phase -->
    <div v-else-if="phase === 'analyzing'" class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div class="text-6xl animate-pulse">🌀</div>
      <p class="text-arcade-gold font-bold tracking-widest">AI 正在感知你的情绪...</p>
      <p class="text-arcade-muted text-xs">{{ thinkingPreview || '分析中' }}</p>
    </div>

    <!-- Result phase -->
    <div v-else-if="phase === 'result' && result" class="space-y-5">
      <!-- SQTI personality card (deep mode) — shows screenshot image -->
      <div v-if="result.sqti_tag" class="mb-4 persona-card-enter">
        <img
          :src="`/personas/${result.sqti_tag}.jpg`"
          :alt="result.emotion_label || result.sqti_tag"
          class="w-full block object-cover rounded-2xl shadow-gold max-h-[70vh]"
        />
      </div>

      <!-- Standard emotion card (quick mode or fallback) -->
      <div v-else class="card-arcade text-center">
        <p class="text-arcade-muted text-xs tracking-widest mb-2">你的情绪标签</p>
        <p class="text-arcade-gold text-2xl font-bold mb-2">{{ result.emotion_label }}</p>
        <p class="text-arcade-muted text-sm leading-relaxed">{{ result.emotion_description }}</p>
      </div>

      <p class="text-arcade-muted text-xs tracking-widest">为你推荐 {{ result.routes.length }} 条场景路线</p>

      <div v-for="(route, ri) in result.routes" :key="ri" class="card-arcade">
        <div class="flex items-start justify-between mb-3 cursor-pointer" @click="expandedRoute = expandedRoute === ri ? -1 : ri">
          <div>
            <p class="text-white font-semibold text-sm">{{ route.title }}</p>
            <p class="text-arcade-muted text-xs mt-0.5">{{ route.mood }}</p>
          </div>
          <div class="text-right shrink-0 ml-3">
            <p class="text-arcade-green text-sm font-bold">¥{{ route.total_cost }}</p>
            <p class="text-arcade-border text-xs mt-0.5">{{ expandedRoute === ri ? '▲ 收起' : '▼ 展开' }}</p>
          </div>
        </div>

        <div v-if="expandedRoute === ri" class="space-y-3 border-t border-arcade-border pt-3">
          <div v-for="(stop, si) in route.stops" :key="si" class="space-y-2">
            <div class="flex items-start gap-3">
              <span class="text-arcade-gold text-xs shrink-0 mt-0.5 font-mono">{{ stop.time }}</span>
              <div class="flex-1">
                <p class="text-white text-xs font-semibold">{{ stop.place }}</p>
                <p class="text-arcade-muted text-xs">{{ stop.activity }}</p>
              </div>
              <span class="text-arcade-green text-xs shrink-0">¥{{ stop.estimated_cost }}</span>
            </div>
            <!-- Shop recommendations -->
            <div class="ml-[3.5rem] space-y-1.5">
              <template v-if="stop.recommended_shops?.length">
                <div
                  v-for="shop in stop.recommended_shops"
                  :key="shop.name"
                  class="rounded border border-arcade-border bg-black/30 px-2.5 py-2 space-y-1"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-white text-xs font-semibold truncate">{{ shop.name }}</span>
                    <span v-if="shop.rating" class="text-arcade-gold text-xs shrink-0">⭐ {{ Number(shop.rating).toFixed(1) }}</span>
                  </div>
                  <div class="flex items-center gap-3 text-arcade-muted text-xs">
                    <span v-if="shop.avgPrice">人均 ¥{{ shop.avgPrice }}</span>
                    <span v-if="shop.address" class="truncate">{{ shop.address.length > 20 ? shop.address.slice(0, 20) + '…' : shop.address }}</span>
                  </div>
                  <div class="flex gap-2 pt-0.5">
                    <a
                      v-if="shop.dianpingUrl"
                      :href="shop.dianpingUrl"
                      target="_blank"
                      rel="noopener"
                      class="text-xs px-2.5 py-0.5 rounded border border-orange-400/50 text-orange-300 hover:bg-orange-400/10 transition-colors"
                    >点评</a>
                    <a
                      v-if="shop.amapNavUrl"
                      :href="shop.amapNavUrl"
                      target="_blank"
                      rel="noopener"
                      class="text-xs px-2.5 py-0.5 rounded border border-arcade-border text-arcade-muted hover:border-arcade-gold/50 hover:text-arcade-gold transition-colors"
                    >导航</a>
                  </div>
                </div>
              </template>
              <p v-else class="text-arcade-border text-xs italic">暂无附近推荐</p>
            </div>
          </div>
        </div>

        <button
          @click="handleOpenHuaclawMapEmotion(route)"
          class="btn-arcade text-sm w-full justify-center mt-2"
          style="border-color:rgba(16,185,129,0.5);color:#10b981;background:transparent;"
        >
          🗺 花爪地图打卡
        </button>
        <button
          @click="handleCheckin(ri)"
          :disabled="checkedIn.has(ri) || checkingIn"
          class="mt-3 w-full text-xs py-2 rounded border transition-colors"
          :class="checkedIn.has(ri)
            ? 'border-arcade-border text-arcade-border cursor-not-allowed'
            : 'border-arcade-green text-arcade-green hover:bg-arcade-green/10'"
        >
          {{ checkedIn.has(ri) ? '✓ 已打卡 +10积分' : '📍 打卡签到 +10积分' }}
        </button>
      </div>

      <button @click="resetQuiz" class="w-full text-arcade-muted text-sm py-3 hover:text-arcade-gold transition-colors">
        重新测试
      </button>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-arcade-red text-xs text-center mt-4">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { openInHuaclawMap, type KoumenRoute } from '../composables/useHuaclawMap';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';

interface Shop {
  name: string;
  rating: number | null;
  avgPrice: number | null;
  address?: string | null;
  dianpingUrl?: string | null;
  amapNavUrl?: string | null;
}
interface RouteStop {
  time: string;
  place: string;
  activity: string;
  estimated_cost: number;
  shop_category?: string;
  recommended_shops?: Shop[];
}
interface EmotionRoute { title: string; mood: string; stops: RouteStop[]; total_cost: number }
interface EmotionResult {
  emotion_label: string;
  sqti_tag?: string;
  sqti_description?: string;
  emotion_description: string;
  routes: EmotionRoute[];
}

const QUICK_QUESTIONS = [
  { id: 1, text: '此刻你的心情更像？', options: ['🌸 治愈系', '⚡ 能量系', '😴 慵懒系', '🌙 神秘系'] },
  { id: 2, text: '理想的社交规模？', options: ['👤 独处', '👫 2-3人小聚', '👥 5-8人派对', '🎉 大型活动'] },
  { id: 3, text: '今天最想做什么？', options: ['🍵 慢体验', '📸 探索打卡', '🛒 购物消费', '🎮 娱乐游玩'] },
  { id: 4, text: '预算范围？', options: ['💚 50元以内', '💛 50-150元', '🧡 150-300元', '❤️ 不限制'] },
  { id: 5, text: '时间充裕度？', options: ['⏰ 1-2小时', '🕐 半天', '🌅 全天', '🌙 晚上'] },
];

const DEEP_QUESTIONS = [
  { id: 1, text: '你今天的心情更像哪种天气？', options: ['☀️ 晴朗明媚', '🌤 云淡风轻', '🌧 细雨绵绵', '⛈ 雷阵雨'] },
  { id: 2, text: '你现在最想用什么方式"消耗"时间？', options: ['🚶 漫无目的地走走', '📖 沉浸在某个故事里', '🎵 用音乐填满空间', '🍳 动手做点什么'] },
  { id: 3, text: '理想的社交规模是？', options: ['👤 一人独处', '👫 2-3亲密好友', '👥 4-8小团体', '🎉 大型社交'] },
  { id: 4, text: '你消费的主要驱动力是什么？', options: ['🔧 功能需求', '💆 情绪疗愈', '🥂 社交仪式', '🎁 自我奖励'] },
  { id: 5, text: '你理想的消费环境是？', options: ['🤫 安静私密', '🏮 热闹有烟火气', '🌿 自然户外', '✨ 精致有腔调'] },
  { id: 6, text: '现在几点你最想出门？', options: ['🌅 上午（10点前）', '☀️ 下午（12-17点）', '🌆 傍晚（17-20点）', '🌙 夜晚（20点后）'] },
  { id: 7, text: '你的可支配预算感觉？', options: ['💚 省着花', '💛 随意花', '🧡 今天特别', '❤️ 不考虑'] },
  { id: 8, text: '什么让你最快获得满足感？', options: ['🍜 美食', '🎡 体验', '🛍 购物', '🛌 休息'] },
  { id: 9, text: '你倾向于？', options: ['📋 规划好的行程', '🎲 随走随看', '🎯 有目标', '🌊 随心而行'] },
  { id: 10, text: '最近让你有共鸣的是？', options: ['🎵 一首歌', '🎬 一部电影', '📚 一本书', '💬 一段对话'] },
  { id: 11, text: '你的身体现在需要？', options: ['🏃 运动放松', '🧘 静止休息', '🎆 感官刺激', '🫖 温暖舒适'] },
  { id: 12, text: '你想要这次出行留下什么？', options: ['📸 美好记忆', '🎁 实用收获', '💨 情绪释放', '🤝 新的认识'] },
];

const auth = useAuthStore();
const phase = ref<'mode-select' | 'quiz' | 'analyzing' | 'result'>('mode-select');
const mode = ref<'quick' | 'deep'>('quick');
const questions = ref(QUICK_QUESTIONS);
const answers = ref<string[]>(Array(QUICK_QUESTIONS.length).fill(''));
const result = ref<EmotionResult | null>(null);
const thinkingPreview = ref('');
const expandedRoute = ref(0);
const checkedIn = ref<Set<number>>(new Set());
const checkingIn = ref(false);
const error = ref('');

const answerCount = computed(() => answers.value.filter(Boolean).length);

function selectMode(m: 'quick' | 'deep') {
  mode.value = m;
  questions.value = m === 'deep' ? DEEP_QUESTIONS : QUICK_QUESTIONS;
  answers.value = Array(questions.value.length).fill('');
  phase.value = 'quiz';
}

async function startAnalysis() {
  phase.value = 'analyzing';
  error.value = '';
  thinkingPreview.value = '';

  try {
    const res = await fetch(api.emotion.quizStreamUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ answers: answers.value, mode: mode.value }),
    });

    if (!res.ok) throw new Error(`请求失败: ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (line === '') { currentEvent = ''; continue; }
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6);
        try {
          const d = JSON.parse(payload);
          if (currentEvent === 'thinking_chunk') {
            if (d.chunk && thinkingPreview.value.length < 60) thinkingPreview.value += d.chunk;
          } else if (currentEvent === 'result_complete' && d.emotion_label) {
            result.value = d;
            phase.value = 'result';
          } else if (currentEvent === 'error') {
            throw new Error(d.message ?? '分析失败');
          }
        } catch (e) {
          if (currentEvent === 'error') throw e;
        }
      }
    }
  } catch (e: unknown) {
    error.value = (e as Error).message ?? '分析失败，请重试';
    phase.value = 'quiz';
  }
}

async function handleCheckin(idx: number) {
  if (!result.value) return;
  checkingIn.value = true;
  try {
    const route = result.value.routes[idx];
    await api.emotion.checkin({
      locationName: route.stops[0]?.place ?? '未知地点',
      lat: 31.18,
      lng: 121.43,
      emotionLabel: result.value.emotion_label,
    });
    checkedIn.value = new Set([...checkedIn.value, idx]);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    error.value = err.response?.data?.message ?? '打卡失败';
  } finally {
    checkingIn.value = false;
  }
}

function handleOpenHuaclawMapEmotion(route: EmotionRoute) {
  const stops = route.stops.map((stop, i) => ({
    seq: i + 1,
    time: stop.time,
    name: stop.recommended_shops?.[0]?.name ?? stop.place,
    activity: stop.activity,
    cost: stop.estimated_cost,
    address: stop.recommended_shops?.[0]?.address ?? undefined,
  }));

  const kr: KoumenRoute = {
    type: 'emotion',
    title: route.title,
    totalCost: route.total_cost,
    stops,
  };
  openInHuaclawMap(kr);
}

function resetQuiz() {
  phase.value = 'mode-select';
  mode.value = 'quick';
  questions.value = QUICK_QUESTIONS;
  answers.value = Array(QUICK_QUESTIONS.length).fill('');
  result.value = null;
  checkedIn.value = new Set();
  thinkingPreview.value = '';
  error.value = '';
  expandedRoute.value = 0;
}
</script>

<style scoped>
.persona-card-enter {
  animation: personaReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes personaReveal {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
