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
        <div><p class="text-arcade-red text-lg font-bold">{{ report.challenge.budget }}</p><p class="text-arcade-muted text-xs">HP预算</p></div>
        <div><p class="text-arcade-green text-lg font-bold">{{ report.percentile }}%</p><p class="text-arcade-muted text-xs">击败用户</p></div>
        <div><p class="text-arcade-blue text-lg font-bold">×3</p><p class="text-arcade-muted text-xs">技能</p></div>
      </div>

      <div class="card-arcade">
        <p class="text-white text-center">{{ report.headline }}</p>
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

interface Report {
  id: string;
  rankTitle: string;
  percentile: number;
  headline: string;
  imageUrl?: string;
  challenge: { savedAmount: number; budget: string };
}

const route = useRoute();
const report = ref<Report | null>(null);
const error = ref('');
const imageUrl = computed(() => report.value ? api.reports.imageUrl(report.value.id) : '');

onMounted(async () => {
  try {
    report.value = (await api.reports.get(route.params.id as string)).data as Report;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? '加载失败，请返回重试';
  }
});

function download() {
  const a = document.createElement('a');
  a.href = imageUrl.value; a.download = 'battle-report.png'; a.click();
}
</script>
