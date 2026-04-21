<template>
  <div class="min-h-screen px-4 pt-6 max-w-lg mx-auto pb-10">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">🪙 积分兑换</h2>
    </div>

    <!-- 积分余额卡片 -->
    <div class="card-arcade text-center mb-6">
      <p class="text-arcade-muted text-xs tracking-widest mb-1">当前积分</p>
      <p class="points-counter text-arcade-gold font-bold leading-none">{{ displayPoints }}</p>
      <p class="text-arcade-muted text-xs mt-2">完成挑战可获得积分 · 地狱×3 普通×2 简单×1</p>
    </div>

    <!-- 兑换渠道列表 -->
    <div v-if="loading" class="card-arcade text-center text-arcade-muted">加载中...</div>

    <div v-else class="space-y-3">
      <div
        v-for="ch in channels"
        :key="ch.id"
        class="card-arcade flex items-center gap-3"
      >
        <div class="text-2xl w-10 text-center">{{ categoryIcon(ch.category) }}</div>
        <div class="flex-1 min-w-0">
          <p class="text-white text-sm font-semibold truncate">{{ ch.name }}</p>
          <p class="text-arcade-muted text-xs truncate">{{ ch.description }}</p>
          <p class="text-arcade-green text-xs mt-0.5">{{ ch.value }}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <p class="text-arcade-gold text-xs">{{ ch.pointsCost }} 积分</p>
          <a
            v-if="points >= ch.pointsCost"
            :href="ch.jumpUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1 text-xs rounded border border-arcade-gold text-arcade-gold hover:bg-arcade-gold hover:text-black transition-colors"
          >去兑换</a>
          <span
            v-else
            class="px-3 py-1 text-xs rounded border border-arcade-border text-arcade-muted cursor-not-allowed"
          >🔒 积分不足</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type ExchangeChannel } from '../api/client';

const points = ref(0);
const displayPoints = ref(0);
const channels = ref<ExchangeChannel[]>([]);
const loading = ref(true);

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
