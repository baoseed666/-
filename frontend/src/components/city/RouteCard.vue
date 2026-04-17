<template>
  <div class="rounded border border-arcade-green/40 bg-arcade-green/5 p-3" data-testid="route-card">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-arcade-green text-sm font-mono font-bold">步行路线</span>
      <span v-if="shopName" class="text-xs text-arcade-muted truncate">→ {{ shopName }}</span>
    </div>

    <div class="text-arcade-gold font-mono font-bold text-base mb-2">{{ route.summary }}</div>

    <div v-if="route.steps?.length" class="space-y-1">
      <div v-for="(step, i) in route.steps.slice(0, 3)" :key="i"
        class="text-xs text-arcade-muted flex gap-2 leading-relaxed">
        <span class="text-arcade-green flex-shrink-0">{{ i + 1 }}.</span>
        <span>{{ step }}</span>
      </div>
      <div v-if="route.steps.length > 3" class="text-xs text-arcade-muted pl-4">
        ...共 {{ route.steps.length }} 步
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface WalkingRoute {
  distance: number;
  duration: number;
  summary: string;
  steps: string[];
}

defineProps<{
  route: WalkingRoute;
  shopName?: string;
}>();
</script>
