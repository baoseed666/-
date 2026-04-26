<template>
  <div class="theme-toggle-wrapper">
    <ThemeToggle />
  </div>
  <router-view />
  <BottomNav />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import BottomNav from './components/BottomNav.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import { useTheme } from './composables/useTheme'

const { init } = useTheme()
onMounted(() => { init() })
</script>
