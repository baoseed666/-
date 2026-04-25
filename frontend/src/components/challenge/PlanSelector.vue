<template>
  <div class="space-y-3">
    <p class="text-arcade-gold text-sm font-bold tracking-widest text-center">⚔️ 选择你的省钱方案</p>
    <div
      v-for="(plan, i) in plans"
      :key="plan.id"
      class="card-arcade cursor-pointer border-2 transition-all"
      :style="plan.difficulty === '地狱'
        ? 'border-color:#ff4444; box-shadow: 0 0 12px rgba(255,68,68,0.2)'
        : plan.difficulty === '普通'
          ? 'border-color:#ffdd00; box-shadow: 0 0 12px rgba(255,221,0,0.2)'
          : 'border-color:#00ff88; box-shadow: 0 0 12px rgba(0,255,136,0.2)'"
      @click="selected = i"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-white font-bold text-sm">{{ plan.title }}</span>
        <span
          class="text-xs px-2 py-0.5 rounded font-bold"
          :class="{
            'bg-arcade-red/20 text-arcade-red': plan.difficulty === '地狱',
            'bg-yellow-500/20 text-yellow-400': plan.difficulty === '普通',
            'bg-arcade-green/20 text-arcade-green': plan.difficulty === '简单',
          }"
        >{{
          plan.difficulty === '地狱' ? '🔥 HELL MODE'
          : plan.difficulty === '普通' ? '⚡ NORMAL'
          : '🌿 EASY'
        }}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p class="text-arcade-green font-bold">¥{{ plan.estimatedSave }}</p>
          <p class="text-arcade-muted">预计省下</p>
        </div>
        <div>
          <p class="text-arcade-red font-bold">¥{{ plan.estimatedSpend }}</p>
          <p class="text-arcade-muted">预计花费</p>
        </div>
        <div>
          <p class="text-arcade-blue font-bold">{{ plan.taskCount }}</p>
          <p class="text-arcade-muted">个任务</p>
        </div>
      </div>
    </div>

    <button
      class="btn-arcade w-full justify-center"
      :disabled="selected === null || confirming"
      :style="selected !== null ? 'background: #ffdd00; color: #0a0a0a;' : ''"
      @click="confirm"
    >
      {{ confirming ? '⚡ 生成任务中...' : '✅ 确认方案，开始挑战' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PlanSummary } from '../../stores/challenge.store';

const props = defineProps<{ plans: PlanSummary[] }>();
const emit = defineEmits<{ (e: 'confirm', planIndex: number): void }>();

const selected = ref<number | null>(0);
const confirming = ref(false);

async function confirm() {
  if (selected.value === null) return;
  confirming.value = true;
  emit('confirm', selected.value);
}
</script>
