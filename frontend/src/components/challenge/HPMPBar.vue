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
