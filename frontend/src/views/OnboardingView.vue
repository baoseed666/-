<template>
  <div class="onb-wrap">
    <div class="waterfall">
      <div v-for="col in 4" :key="col" class="wf-col" :style="{ animationDelay: `${(col-1) * -5}s` }">
        <div v-for="row in 8" :key="row" class="wf-item" :style="wfStyle(col, row)" />
      </div>
    </div>
    <div class="onb-overlay" />
    <div class="onb-center">
      <div class="onb-title title-arcade">抠门大王</div>
      <div class="onb-sub">不买立省100%</div>
    </div>
    <button class="onb-skip btn-arcade" @click="finish">
      跳过
    </button>
    <div class="onb-track">
      <span class="onb-hint">向右滑动进入</span>
      <div
        class="onb-slider"
        :style="{ transform: `translateX(${sliderX}px)` }"
        @mousedown="onMD"
        @touchstart.prevent="onTS"
      >▶</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const WF_PALETTE = ['#1a1a00','#0a1200','#001212','#180012','#1a0800']
const MAX = 280 - 48 - 4

const router = useRouter()
const sliderX = ref(0)
let startX = 0

// Track active listeners for cleanup on unmount
let activeCleanup: (() => void) | null = null
onUnmounted(() => activeCleanup?.())

const wfStyle = (col: number, row: number) => ({
  background: WF_PALETTE[(col * 3 + row) % WF_PALETTE.length],
  height: `${100 + row * 18}px`,
  borderRadius: '4px',
  flexShrink: 0,
})

function finish() {
  localStorage.setItem('koumen_onboarding_done', 'true')
  router.replace('/')
}

function move(x: number) {
  sliderX.value = Math.max(0, Math.min(MAX, x - startX))
  if (sliderX.value / MAX >= 0.8) finish()
}

function onMD(e: MouseEvent) {
  startX = e.clientX - sliderX.value
  const mm = (ev: MouseEvent) => move(ev.clientX)
  const mu = () => { sliderX.value = 0; window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); activeCleanup = null }
  activeCleanup = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  window.addEventListener('mousemove', mm)
  window.addEventListener('mouseup', mu)
}

function onTS(e: TouchEvent) {
  startX = e.touches[0].clientX - sliderX.value
  const tm = (ev: TouchEvent) => { ev.preventDefault(); move(ev.touches[0].clientX) }
  const te = () => { sliderX.value = 0; window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); activeCleanup = null }
  activeCleanup = () => { window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te) }
  window.addEventListener('touchmove', tm, { passive: false })
  window.addEventListener('touchend', te)
}
</script>

<style scoped>
.onb-wrap {
  position: fixed; inset: 0; background: #0a0a0a;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden; z-index: 9000;
}
.waterfall {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px; overflow: hidden; pointer-events: none;
}
.wf-col {
  display: flex; flex-direction: column; gap: 4px;
  animation: wfScroll 18s linear infinite;
}
.wf-col:nth-child(even) { animation-direction: reverse; }
@keyframes wfScroll { to { transform: translateY(-50%); } }
.onb-overlay {
  position: absolute; inset: 0;
  background: rgba(10,10,10,0.78); pointer-events: none;
}
.onb-center { position: relative; text-align: center; z-index: 1; }
.onb-title {
  font-size: 2.8rem; color: #ffdd00;
  text-shadow: 0 0 24px rgba(255,221,0,0.5);
  animation: flicker 4s ease-in-out infinite;
}
.onb-sub {
  font-family: 'Courier New', monospace;
  color: #888844; font-size: 0.95rem;
  margin-top: 8px; letter-spacing: 0.25em;
}
.onb-track {
  position: absolute; bottom: 56px;
  width: 284px; height: 52px;
  border: 1px solid #333300; border-radius: 26px;
  background: #111100; display: flex; align-items: center;
  padding: 2px; z-index: 2;
}
.onb-hint {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 11px; color: #888844; letter-spacing: 0.2em;
  pointer-events: none;
}
.onb-slider {
  width: 48px; height: 44px; border-radius: 22px;
  background: #ffdd00; color: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; cursor: grab; user-select: none;
  position: relative; z-index: 3;
  box-shadow: 0 0 14px rgba(255,221,0,0.45);
}
.onb-slider:active { cursor: grabbing; }
.onb-skip {
  position: absolute; top: 16px; right: 16px;
  padding: 6px 14px; font-size: 12px;
}
</style>
