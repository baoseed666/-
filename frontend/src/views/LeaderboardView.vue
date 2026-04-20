<template>
  <div class="min-h-screen px-4 pt-6 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">🏆 省钱排行榜</h2>
    </div>

    <div v-if="stats" class="card-arcade mb-6 text-center">
      <p class="text-arcade-muted text-xs">今日 {{ stats.city }}</p>
      <p class="text-2xl text-arcade-gold font-bold">{{ stats.todayCount }} 人省下 ¥{{ stats.todayTotalSaved.toFixed(0) }}</p>
    </div>

    <div class="space-y-2">
      <div v-for="(u, i) in leaderboard" :key="u.id" class="card-arcade flex items-center gap-3">
        <span :class="['text-lg font-bold w-8 text-center', i < 3 ? 'text-arcade-gold' : 'text-arcade-muted']">#{{ i + 1 }}</span>
        <div class="flex-1">
          <p class="text-white text-sm">{{ u.nickname }}</p>
          <p class="text-arcade-muted text-xs">{{ u.rankTitle }}</p>
        </div>
        <div class="text-right">
          <p class="text-arcade-green font-bold text-sm">¥{{ parseFloat(u.totalSaved).toFixed(0) }}</p>
          <p class="text-arcade-gold text-xs">{{ u.points ?? 0 }} 积分</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';

interface LeaderboardUser {
  id: string;
  nickname: string;
  rankTitle: string;
  totalSaved: string;
  points: number;
}

interface CityStats {
  city: string;
  todayCount: number;
  todayTotalSaved: number;
}

const leaderboard = ref<LeaderboardUser[]>([]);
const stats = ref<CityStats | null>(null);

onMounted(async () => {
  const city = '上海';
  [leaderboard.value, stats.value] = await Promise.all([
    api.leaderboard.get(city).then((r) => r.data as LeaderboardUser[]),
    api.leaderboard.cityStats(city).then((r) => r.data as CityStats),
  ]);
});
</script>
