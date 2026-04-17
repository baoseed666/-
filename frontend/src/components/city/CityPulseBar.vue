<template>
  <div class="relative overflow-hidden rounded border border-arcade-border bg-arcade-dim p-3 mb-4"
    data-testid="city-pulse-bar">
    <!-- CRT scanline -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
      <div class="h-px w-full bg-arcade-gold animate-scanline absolute" />
    </div>

    <!-- Top row: weather + crowd + hot zone -->
    <div class="flex items-center justify-between gap-2 relative z-10">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xl leading-none flex-shrink-0">{{ pulse.weather.icon }}</span>
        <div class="min-w-0">
          <div class="text-sm text-white font-mono font-bold leading-none">{{ pulse.weather.temp }}°C</div>
          <div class="text-xs text-arcade-muted truncate">{{ pulse.weather.desc }}</div>
        </div>
      </div>

      <div class="flex items-center gap-4 flex-shrink-0">
        <div class="text-center">
          <div :class="crowdColor" class="text-xs font-mono font-bold tracking-wider leading-none">{{ crowdText }}</div>
          <div class="text-xs text-arcade-muted mt-0.5">人流</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-arcade-gold font-mono font-bold truncate max-w-[5rem] leading-none">{{ pulse.hotNeighborhood }}</div>
          <div class="text-xs text-arcade-muted mt-0.5">热点</div>
        </div>
      </div>
    </div>

    <!-- Events strip -->
    <div v-if="pulse.activeEvents?.length"
      class="flex gap-2 overflow-x-auto mt-2 pb-0.5 relative z-10"
      style="scrollbar-width: none; -ms-overflow-style: none;">
      <EventCard
        v-for="ev in pulse.activeEvents.slice(0, 5)"
        :key="ev.name"
        :event="ev"
        compact
      />
    </div>

    <!-- Tip -->
    <p v-if="pulse.tip" class="text-xs text-arcade-muted border-t border-arcade-border pt-2 mt-2 font-mono relative z-10 leading-relaxed">
      <span class="text-arcade-gold">››</span> {{ pulse.tip }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EventCard, { type PulseEvent } from './EventCard.vue';

export interface CityPulseData {
  weather: { temp: number; desc: string; suitable: boolean; icon: string };
  crowdLevel: 'low' | 'medium' | 'high';
  hotNeighborhood: string;
  openShopsCount: number;
  tip: string;
  activeEvents?: PulseEvent[];
}

const props = defineProps<{ pulse: CityPulseData }>();

const crowdText = computed(() => ({ low: '人流稀少', medium: '人流适中', high: '人较多' }[props.pulse.crowdLevel] ?? props.pulse.crowdLevel));
const crowdColor = computed(() => ({ low: 'text-arcade-green', medium: 'text-arcade-gold', high: 'text-arcade-red' }[props.pulse.crowdLevel] ?? 'text-white'));
</script>
