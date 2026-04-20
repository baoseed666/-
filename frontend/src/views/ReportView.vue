<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
    <div v-if="report" class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <p class="text-arcade-muted text-xs tracking-widest mb-2">BATTLE REPORT</p>
        <h1 class="text-2xl font-bold text-arcade-gold">【{{ report.rankTitle }}】</h1>
        <p class="text-5xl font-bold text-white mt-4">¥{{ report.challenge.savedAmount }}</p>
        <p class="text-arcade-muted text-sm">成功省下</p>
      </div>

      <div class="card-arcade grid grid-cols-3 gap-4 text-center">
        <div><p class="text-arcade-red text-lg font-bold">{{ report.challenge.budget ?? '—' }}</p><p class="text-arcade-muted text-xs">HP预算</p></div>
        <div><p class="text-arcade-green text-lg font-bold">{{ report.percentile }}%</p><p class="text-arcade-muted text-xs">击败用户</p></div>
        <div><p class="text-arcade-gold text-lg font-bold">+{{ report.challenge.pointsEarned ?? 0 }}</p><p class="text-arcade-muted text-xs">积分</p></div>
      </div>

      <div class="card-arcade">
        <p class="text-white text-center">{{ report.headline }}</p>
      </div>

      <!-- 周期战绩 -->
      <div v-if="periodStats" class="card-arcade space-y-3">
        <p class="text-arcade-gold text-xs font-bold tracking-widest">📊 我的战绩</p>
        <div class="flex gap-1">
          <button
            v-for="p in periods"
            :key="p.key"
            :class="['flex-1 text-xs py-1 rounded transition-colors', activePeriod === p.key ? 'bg-arcade-gold text-arcade-black font-bold' : 'text-arcade-muted border border-arcade-border']"
            @click="activePeriod = p.key"
          >{{ p.label }}</button>
        </div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div><p class="text-arcade-green font-bold">¥{{ periodStats[activePeriod].saved.toFixed(0) }}</p><p class="text-arcade-muted text-xs">省下</p></div>
          <div><p class="text-white font-bold">{{ periodStats[activePeriod].count }}</p><p class="text-arcade-muted text-xs">次挑战</p></div>
          <div><p class="text-arcade-gold font-bold">{{ periodStats[activePeriod].points }}</p><p class="text-arcade-muted text-xs">积分</p></div>
        </div>
      </div>

      <img v-if="report.imageUrl" :src="imageUrl" class="w-full rounded border border-arcade-border" alt="战报海报" />

      <div class="flex gap-3">
        <button @click="download" class="btn-arcade flex-1 justify-center text-sm">⬇ 保存海报</button>
        <router-link to="/" class="btn-arcade flex-1 justify-center text-sm text-center">⚔️ 再战一局</router-link>
      </div>
    </div>

    <div v-else class="text-center space-y-3">
      <p class="text-arcade-muted">{{ error || '加载战报中...' }}</p>
      <router-link v-if="error" to="/" class="btn-arcade text-sm">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/client';

interface PeriodData { saved: number; count: number; points: number; }
interface PeriodStats { daily: PeriodData; weekly: PeriodData; monthly: PeriodData; yearly: PeriodData; }
interface Report {
  id: string;
  rankTitle: string;
  percentile: number;
  headline: string;
  imageUrl?: string;
  challenge: { savedAmount: number; budget: string | null; pointsEarned: number };
}

const route = useRoute();
const report = ref<Report | null>(null);
const periodStats = ref<PeriodStats | null>(null);
const activePeriod = ref<keyof PeriodStats>('weekly');
const error = ref('');
const imageUrl = computed(() => report.value ? api.reports.imageUrl(report.value.id) : '');
const periods = [
  { key: 'daily' as const, label: '今日' },
  { key: 'weekly' as const, label: '本周' },
  { key: 'monthly' as const, label: '本月' },
  { key: 'yearly' as const, label: '本年' },
];

onMounted(async () => {
  try {
    [report.value, periodStats.value] = await Promise.all([
      api.reports.get(route.params.id as string).then((r) => r.data as Report),
      api.reports.myStats().then((r) => r.data as PeriodStats),
    ]);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '加载失败，请返回重试';
  }
});

function download() {
  const a = document.createElement('a');
  a.href = imageUrl.value; a.download = 'battle-report.png'; a.click();
}
</script>
