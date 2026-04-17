<template>
  <!-- Compact chip mode (inside CityPulseBar) -->
  <div v-if="compact"
    class="flex-shrink-0 border border-arcade-border rounded px-2 py-1 bg-arcade-black/60"
    data-testid="event-card-compact">
    <div class="text-xs text-arcade-gold font-mono font-bold whitespace-nowrap max-w-[7rem] truncate">{{ event.name }}</div>
    <div class="text-xs text-arcade-muted whitespace-nowrap">
      {{ event.costLow === 0 ? '免费' : `¥${event.costLow}起` }}
    </div>
  </div>

  <!-- Full card mode -->
  <div v-else class="card-arcade" data-testid="event-card">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div>
        <h4 class="text-sm font-bold text-white">{{ event.name }}</h4>
        <div class="text-xs text-arcade-muted mt-0.5">{{ event.neighborhood }}</div>
      </div>
    </div>

    <div v-if="event.tags?.length" class="flex flex-wrap gap-1 mb-2">
      <span v-for="tag in event.tags.slice(0, 3)" :key="tag"
        class="text-xs px-1.5 py-0.5 rounded bg-arcade-gold/10 border border-arcade-gold/30 text-arcade-gold">
        {{ tag }}
      </span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm font-bold" :class="event.costLow === 0 ? 'text-arcade-green' : 'text-arcade-gold'">
        {{ event.costLow === 0 ? '免费' : `¥${event.costLow}${event.costHigh > event.costLow ? `~${event.costHigh}` : ''}` }}
      </span>
      <a v-if="event.bookingUrl" :href="event.bookingUrl" target="_blank" rel="noopener noreferrer"
        class="text-xs text-arcade-blue hover:text-arcade-gold transition-colors border border-arcade-blue/40 px-2 py-0.5 rounded cursor-pointer">
        去预约
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface PulseEvent {
  name: string;
  neighborhood: string;
  costLow: number;
  costHigh: number;
  tags: string[];
  bookingUrl: string;
}

defineProps<{
  event: PulseEvent;
  compact?: boolean;
}>();
</script>
