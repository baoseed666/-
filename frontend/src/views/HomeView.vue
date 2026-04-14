<template>
  <div class="relative min-h-screen overflow-hidden">
    <SceneCanvas class="z-0" />

    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-arcade-gold tracking-widest mb-2">抠门大王</h1>
        <p class="text-arcade-muted tracking-widest text-sm">当 AI 都在推荐你买什么，我们教你怎么不买</p>
      </div>

      <div v-if="cityStats" class="text-xs text-arcade-muted text-center mb-6">
        今晚{{ selectedCity }}已有 <span class="text-arcade-gold">{{ cityStats.todayCount }}</span> 人省下
        <span class="text-arcade-green">¥{{ cityStats.todayTotalSaved.toFixed(0) }}</span>
      </div>

      <div class="w-full max-w-md card-arcade space-y-4">
        <select v-model="selectedCity"
          class="w-full bg-arcade-dim border border-arcade-border rounded px-3 py-2 text-arcade-gold focus:border-arcade-gold focus:outline-none">
          <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
        </select>

        <textarea v-model="inputText" rows="3" placeholder="今晚烧烤，预算30，2人..."
          class="w-full bg-transparent border border-arcade-border rounded px-3 py-2 text-white placeholder-arcade-muted resize-none focus:border-arcade-gold focus:outline-none transition-colors" />

        <button @click="startChallenge" :disabled="loading || !inputText.trim()" class="btn-arcade w-full justify-center text-lg">
          {{ loading ? '⚡ AI正在谋划...' : '⚔️ 发起省钱挑战' }}
        </button>

        <p v-if="error" class="text-arcade-red text-xs text-center">{{ error }}</p>
      </div>

      <div class="flex gap-4 mt-6">
        <router-link to="/leaderboard" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">🏆 排行榜</router-link>
        <router-link to="/profile" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">👤 我的</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChallengeStore } from '../stores/challenge.store';
import { api } from '../api/client';
import SceneCanvas from '../components/three/SceneCanvas.vue';

const router = useRouter();
const challenge = useChallengeStore();
const inputText = ref('');
const selectedCity = ref('上海');
const loading = ref(false);
const error = ref('');
const cityStats = ref<{ todayCount: number; todayTotalSaved: number } | null>(null);
const cities = ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '西安'];

onMounted(async () => {
  try { cityStats.value = (await api.leaderboard.cityStats(selectedCity.value)).data as { todayCount: number; todayTotalSaved: number }; } catch { /* ignore */ }
});

async function startChallenge() {
  error.value = '';
  loading.value = true;
  try {
    const { id } = await challenge.create(inputText.value, selectedCity.value);
    await router.push(`/challenge/${id}`);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    error.value = err.response?.data?.message ?? '创建失败，请重试';
  }
  finally { loading.value = false; }
}
</script>
