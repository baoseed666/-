<template>
  <nav v-if="show" class="fixed bottom-0 left-0 right-0 z-50 bg-arcade-black border-t border-arcade-border safe-bottom">
    <div class="flex max-w-lg mx-auto">
      <router-link
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
        :class="isActive(tab) ? 'text-arcade-gold' : 'text-arcade-muted hover:text-white'"
      >
        <span class="text-lg leading-none">{{ tab.icon }}</span>
        <span class="text-[10px] tracking-wider font-mono">{{ tab.label }}</span>
        <span v-if="isActive(tab)" class="w-1 h-1 rounded-full bg-arcade-gold mt-0.5" />
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute();
const auth = useAuthStore();

const tabs = [
  { to: '/', icon: '⚔️', label: '挑战' },
  { to: '/emotion', icon: '🎭', label: '情绪' },
  { to: '/leaderboard', icon: '🏆', label: '排行' },
  { to: '/points', icon: '🪙', label: '积分' },
  { to: '/profile', icon: '👤', label: '我的' },
];

const hideRoutes = ['/login'];

const show = computed(() => {
  if (!auth.isLoggedIn) return false;
  return !hideRoutes.includes(route.path);
});

function isActive(tab: { to: string }) {
  if (tab.to === '/') return route.path === '/';
  return route.path.startsWith(tab.to);
}
</script>
