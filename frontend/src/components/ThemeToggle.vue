<template>
  <button
    class="theme-toggle"
    :aria-label="theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'"
    @click="toggle"
  >
    <span>{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
    <span>{{ theme === 'dark' ? '夜' : '日' }}</span>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
const { theme, toggle } = useTheme()
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--arcade-gold);
  border-radius: 999px;
  background: var(--arcade-dim);
  color: var(--arcade-gold);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.theme-toggle:hover {
  background: var(--arcade-gold);
  color: var(--arcade-black);
}
</style>
