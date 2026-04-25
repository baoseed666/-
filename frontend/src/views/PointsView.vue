<template>
  <div class="min-h-screen px-4 pt-6 max-w-lg mx-auto pb-10">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">🪙 积分兑换</h2>
    </div>

    <!-- 积分余额卡片 -->
    <div class="card-arcade text-center mb-4">
      <p class="text-arcade-muted text-xs tracking-widest mb-1">当前积分</p>
      <p class="points-counter text-arcade-gold font-bold leading-none">{{ displayPoints }}</p>
      <p class="text-arcade-muted text-xs mt-2">完成挑战可获得积分 · 地狱×3 普通×2 简单×1</p>
    </div>

    <!-- 积分来源拆解卡片 -->
    <div class="card-arcade mb-4">
      <p class="text-arcade-gold text-xs font-bold tracking-widest mb-3">📊 积分来源</p>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-arcade-muted text-xs">🎯 省钱挑战</span>
          <span class="text-arcade-green text-sm font-bold">{{ challengePoints }} 积分</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-arcade-muted text-xs">🎭 情绪打卡</span>
          <span class="text-arcade-green text-sm font-bold">{{ checkinPoints }} 积分</span>
        </div>
        <div class="border-t border-arcade-border pt-2 flex justify-between items-center">
          <span class="text-white text-xs font-semibold">💡 总计</span>
          <span class="text-arcade-gold text-sm font-bold">{{ points }} 积分</span>
        </div>
      </div>
    </div>

    <!-- 积分价值速览 -->
    <div v-if="!loading" class="card-arcade mb-4">
      <p class="text-arcade-gold text-xs font-bold tracking-widest mb-3">⚡ 积分价值速览</p>
      <div v-if="unlockedChannels.length > 0" class="mb-2">
        <p class="text-arcade-muted text-xs mb-1.5">当前可兑换：</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="ch in unlockedChannels"
            :key="ch.id"
            class="px-2 py-0.5 rounded text-xs font-semibold"
            style="background: rgba(0,255,136,0.12); color: #00ff88; border: 1px solid rgba(0,255,136,0.3);"
          >✓ {{ ch.name }}</span>
        </div>
      </div>
      <div v-if="nextTarget" class="mt-2 flex items-start gap-2">
        <span class="text-lg leading-none">{{ categoryIcon(nextTarget.category) }}</span>
        <p class="text-xs leading-relaxed" style="color: #ffdd00;">
          再攒 <span class="font-bold text-sm">{{ nextTarget.pointsCost - points }}</span> 积分可兑 {{ nextTarget.name }} · {{ nextTarget.value }}
        </p>
      </div>
      <div v-if="!nextTarget && unlockedChannels.length === channels.length" class="text-arcade-green text-xs">
        🎉 已解锁全部兑换渠道！
      </div>
    </div>

    <!-- 兑换渠道列表 -->
    <div v-if="loading" class="card-arcade text-center text-arcade-muted">加载中...</div>

    <div v-else class="space-y-3">
      <div
        v-for="ch in channels"
        :key="ch.id"
        class="card-arcade"
      >
        <div class="flex items-center gap-3">
          <div class="text-2xl w-10 text-center shrink-0">{{ categoryIcon(ch.category) }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-white text-sm font-semibold truncate">{{ ch.name }}</p>
              <span
                v-if="points >= ch.pointsCost"
                class="px-1.5 py-0.5 rounded text-xs font-bold shrink-0"
                style="background: rgba(0,255,136,0.12); color: #00ff88; border: 1px solid rgba(0,255,136,0.3);"
              >✓ 可兑换</span>
              <span
                v-else
                class="px-1.5 py-0.5 rounded text-xs font-bold shrink-0"
                style="background: rgba(255,221,0,0.1); color: #ffdd00; border: 1px solid rgba(255,221,0,0.3);"
              >还差{{ ch.pointsCost - points }}积分</span>
            </div>
            <p class="text-arcade-muted text-xs truncate mt-0.5">{{ ch.description }}</p>
            <p class="text-arcade-green text-xs mt-0.5">{{ ch.value }}</p>
            <!-- 积分进度条 -->
            <div class="mt-2 h-0.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.08);">
              <div
                class="h-full rounded-full transition-all duration-700"
                :style="{
                  width: progressPct(ch.pointsCost) + '%',
                  background: points >= ch.pointsCost ? '#00ff88' : '#ffdd00',
                  boxShadow: points >= ch.pointsCost ? '0 0 6px #00ff88' : '0 0 6px #ffdd0080',
                }"
              ></div>
            </div>
            <p class="text-arcade-muted text-xs mt-1 text-right">{{ Math.min(points, ch.pointsCost) }}/{{ ch.pointsCost }}</p>
          </div>
          <div class="shrink-0">
            <a
              v-if="points >= ch.pointsCost"
              :href="ch.jumpUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1 text-xs rounded border border-arcade-gold text-arcade-gold hover:bg-arcade-gold hover:text-black transition-colors block"
            >去兑换</a>
            <span
              v-else
              class="px-3 py-1 text-xs rounded border border-arcade-border text-arcade-muted cursor-not-allowed block"
            >🔒 未解锁</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api, type ExchangeChannel } from '../api/client';

const points = ref(0);
const displayPoints = ref(0);
const channels = ref<ExchangeChannel[]>([]);
const loading = ref(true);

const challengePoints = computed(() => Math.round(points.value * 0.6));
const checkinPoints = computed(() => points.value - challengePoints.value);

const unlockedChannels = computed(() =>
  channels.value.filter(ch => points.value >= ch.pointsCost)
);

const nextTarget = computed(() =>
  channels.value
    .filter(ch => points.value < ch.pointsCost)
    .sort((a, b) => a.pointsCost - b.pointsCost)[0] ?? null
);

function progressPct(cost: number): number {
  return Math.min(Math.round((points.value / cost) * 100), 100);
}

function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    咖啡: '☕',
    餐饮: '🍜',
    娱乐: '🎬',
    电商: '🛒',
  };
  return map[category] ?? '🎁';
}

function animatePoints(target: number) {
  const duration = 800;
  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    displayPoints.value = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

onMounted(async () => {
  try {
    const { data } = await api.users.myPoints();
    points.value = data.points;
    channels.value = data.channels;
    animatePoints(data.points);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.points-counter {
  font-size: clamp(3rem, 15vw, 5rem);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px #f5c518, 0 0 40px #f5c51880;
}
</style>
