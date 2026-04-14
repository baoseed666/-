<template>
  <div class="card-arcade">
    <h3 class="text-arcade-gold font-bold tracking-widest mb-4">🗺️ 拼单匹配</h3>

    <div v-if="lbs.status === 'idle'" class="space-y-3">
      <p class="text-arcade-muted text-sm">找到附近省钱伙伴，一起拼单更划算！</p>
      <button @click="startMatch" :disabled="!hasLocation" class="btn-arcade w-full justify-center text-sm">
        {{ hasLocation ? '开始寻找伙伴' : '获取定位中...' }}
      </button>
    </div>

    <div v-else-if="lbs.status === 'waiting'" class="text-center space-y-3">
      <p class="text-arcade-gold animate-pulse">⚡ 正在寻找附近省钱伙伴...</p>
      <button @click="cancelMatch" class="text-arcade-muted text-sm hover:text-arcade-red">取消</button>
    </div>

    <div v-else-if="lbs.status === 'matched'" class="text-center space-y-2">
      <p class="text-arcade-green font-bold">✓ 匹配成功！</p>
      <p class="text-arcade-muted text-sm">已找到省钱伙伴</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLBSStore } from '../stores/lbs.store';
import { useAuthStore } from '../stores/auth.store';

const lbs = useLBSStore();
const auth = useAuthStore();
const lat = ref(0);
const lng = ref(0);
const hasLocation = ref(false);

const props = defineProps<{ tags?: string[]; shopId?: string }>();

onMounted(() => {
  navigator.geolocation.getCurrentPosition(
    (pos) => { lat.value = pos.coords.latitude; lng.value = pos.coords.longitude; hasLocation.value = true; },
    () => { hasLocation.value = false; },
  );
});

function startMatch() {
  if (!auth.user?.id) return;
  lbs.requestMatch(auth.user.id, lat.value, lng.value, props.tags ?? [], props.shopId);
}

function cancelMatch() {
  if (!auth.user?.id) return;
  lbs.cancel(auth.user.id);
}
</script>
