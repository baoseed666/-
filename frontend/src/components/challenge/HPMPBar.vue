<template>
  <div class="space-y-2 p-3 rounded border border-arcade-border/60 bg-black/30">
    <!-- HP Row -->
    <div class="flex justify-between items-center mb-1">
      <span class="text-arcade-red text-xs tracking-widest font-mono font-bold">HP</span>
      <span class="text-arcade-red text-xs font-mono">¥{{ current.toFixed(0) }} / ¥{{ max.toFixed(0) }}</span>
    </div>
    <div class="relative h-3 bg-black rounded overflow-hidden border border-arcade-red/20">
      <div
        class="h-full rounded transition-all duration-700 ease-out"
        :style="{
          width: `${hpPercent}%`,
          background: 'linear-gradient(90deg, #cc2222, #ff4444)',
          boxShadow: '0 0 8px rgba(255,68,68,0.6)',
        }"
      />
    </div>

    <!-- MP Row -->
    <div class="flex justify-between items-center mt-2 mb-1">
      <span class="text-arcade-blue text-xs tracking-widest font-mono font-bold">MP</span>
      <div class="flex gap-1">
        <span
          v-for="i in mp" :key="i"
          class="w-4 h-3 rounded-sm"
          style="background: #4488ff; box-shadow: 0 0 6px rgba(68,136,255,0.7);"
        />
        <span
          v-for="i in (maxMp - mp)" :key="`e${i}`"
          class="w-4 h-3 rounded-sm bg-arcade-border"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ current: number; max: number; mp: number }>();
const maxMp = 5;
const hpPercent = computed(() => Math.min(100, (props.current / props.max) * 100));
</script>
