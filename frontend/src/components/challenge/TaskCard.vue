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
    <ul v-if="task.tips?.length" class="space-y-1">
      <li v-for="tip in task.tips" :key="tip" class="text-xs text-arcade-muted flex gap-1">
        <span class="text-arcade-gold">›</span> {{ tip }}
      </li>
    </ul>
    <p v-if="task.shop?.name" class="text-xs text-arcade-green mt-2">📍 {{ task.shop.name }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ task: { id: string; type: string; status: string; description: string; tips?: string[]; shop?: { name: string } } }>();
defineEmits<{ (e: 'complete', id: string): void }>();

const typeLabel = computed(() => ({ main: '🎯 主线任务', side: '⚡ 支线任务', hidden: '🏆 隐藏成就' }[props.task.type as 'main' | 'side' | 'hidden'] ?? props.task.type));
const badgeClass = computed(() => ({ main: 'border-arcade-green text-arcade-green', side: 'border-arcade-gold text-arcade-gold', hidden: 'border-arcade-blue text-arcade-blue' }[props.task.type as 'main' | 'side' | 'hidden'] ?? ''));
</script>
