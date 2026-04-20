<template>
  <div class="min-h-screen px-4 pt-6 pb-24 max-w-lg mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">省钱挑战</h2>
      <span v-if="locationStatus === 'locating'" class="ml-auto text-xs text-arcade-muted animate-pulse">📡 定位中...</span>
      <span v-else-if="locationStatus === 'ok'" class="ml-auto text-xs text-arcade-green" data-testid="location-ok">📍 已定位</span>
      <span v-else-if="locationStatus === 'denied'" class="ml-auto text-xs text-arcade-muted" data-testid="location-denied">📍 位置未知</span>
    </div>

    <!-- City pulse bar (appears on city_pulse SSE event) -->
    <CityPulseBar v-if="store.cityPulse" :pulse="store.cityPulse" />

    <HPMPBar v-if="challenge && challenge.budget != null" :current="parseFloat(challenge.budget)" :max="parseFloat(challenge.budget)" :mp="3" class="mb-4" />

    <!-- Streaming state -->
    <div v-if="streaming" class="card-arcade mb-4">
      <p class="text-arcade-gold text-sm animate-pulse">
        {{ store.actionQuery ? `⚡ 正在搜索「${store.actionQuery.category}」省钱方案...` : '⚡ AI 正在谋划省钱方案...' }}
      </p>
      <p class="text-arcade-muted text-xs mt-1">{{ streamBuffer.length }} 字符已接收</p>
    </div>

    <!-- Plan selector (appears after streaming, before task confirmation) -->
    <PlanSelector
      v-if="!streaming && store.pendingPlans.length && !challenge?.tasks?.length"
      :plans="store.pendingPlans"
      @confirm="handleConfirmPlan"
      class="mb-4"
    />

    <!-- Tasks -->
    <div v-if="challenge?.tasks?.length" class="space-y-3">
      <div v-for="(task, i) in challenge.tasks" :key="task.id">
        <TaskCard
          :task="mergeTaskShops(task, i)"
          @complete="completeTask(task.id)"
        />
      </div>
    </div>

    <!-- Route card (appears on route_ready SSE event) -->
    <RouteCard
      v-if="store.route"
      :route="store.route.route"
      :shop-name="routeShopName"
      class="mt-3"
    />

    <!-- Complete button -->
    <div v-if="challenge?.tasks?.length && !streaming" class="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
      <button @click="showCompleteModal = true" class="btn-arcade w-full justify-center text-lg">
        🏆 完成挑战，生成战报
      </button>
    </div>

    <!-- Complete modal -->
    <div v-if="showCompleteModal" class="fixed inset-0 bg-black/80 flex items-center justify-center px-6 z-50">
      <div class="card-arcade w-full max-w-sm space-y-4">
        <h3 class="text-arcade-gold font-bold">确认完成挑战</h3>
        <div>
          <label class="text-arcade-muted text-xs">实际省下多少钱（元）</label>
          <input v-model.number="savedAmount" type="number" min="0"
            class="w-full bg-transparent border border-arcade-border rounded px-3 py-2 text-white mt-1 focus:border-arcade-gold focus:outline-none" />
        </div>
        <div class="flex gap-3">
          <button @click="showCompleteModal = false" class="flex-1 btn-arcade text-sm">取消</button>
          <button @click="handleComplete" class="flex-1 btn-arcade text-sm bg-arcade-gold text-arcade-black">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChallengeStore } from '../stores/challenge.store';
import { api } from '../api/client';
import HPMPBar from '../components/challenge/HPMPBar.vue';
import TaskCard from '../components/challenge/TaskCard.vue';
import PlanSelector from '../components/challenge/PlanSelector.vue';
import CityPulseBar from '../components/city/CityPulseBar.vue';
import RouteCard from '../components/city/RouteCard.vue';
import type { ShopRecommendation } from '../components/shop/ShopCard.vue';

interface Task {
  id: string;
  type: string;
  status: string;
  description: string;
  tips?: string[];
  shop?: { name: string };
  shopRecommendations?: ShopRecommendation[];
}

interface Challenge {
  id: string;
  budget: string;
  tasks?: Task[];
}

const route = useRoute();
const router = useRouter();
const store = useChallengeStore();
const challenge = ref<Challenge | null>(null);
const streaming = ref(false);
const streamBuffer = ref('');
const showCompleteModal = ref(false);
const savedAmount = ref(0);

const userLat = ref<number | undefined>(undefined);
const userLng = ref<number | undefined>(undefined);
type LocationStatus = 'idle' | 'locating' | 'ok' | 'denied';
const locationStatus = ref<LocationStatus>('idle');

const routeShopName = computed(() => {
  if (!store.route) return undefined;
  for (const shops of Object.values(store.shopMatches)) {
    const found = shops.find((s) => s.id === store.route!.shopId);
    if (found) return found.name;
  }
  return undefined;
});

function mergeTaskShops(task: Task, index: number): Task {
  const liveShops = store.shopMatches[index];
  if (!liveShops?.length) return task;
  return { ...task, shopRecommendations: liveShops };
}

function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    locationStatus.value = 'locating';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat.value = pos.coords.latitude;
        userLng.value = pos.coords.longitude;
        locationStatus.value = 'ok';
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        locationStatus.value = 'denied';
        resolve(null);
      },
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

onMounted(async () => {
  const id = route.params.id as string;
  challenge.value = await store.load(id) as Challenge;

  if (!challenge.value.tasks?.length) {
    const loc = await getLocation();
    streaming.value = true;
    await store.startStream(
      id,
      loc?.lat,
      loc?.lng,
      (chunk) => { streamBuffer.value += chunk; },
      async () => {
        streaming.value = false;
        challenge.value = await store.load(id) as Challenge;
      },
    );
  } else {
    getLocation();
  }
});

async function handleConfirmPlan(planIndex: number) {
  if (!challenge.value) return;
  challenge.value = await store.confirmPlan(
    challenge.value.id,
    planIndex,
    userLat.value,
    userLng.value,
  ) as Challenge;
}

async function completeTask(taskId: string) {
  if (!challenge.value) return;
  await store.updateTask(challenge.value.id, taskId, 'done');
  challenge.value = await store.load(challenge.value.id) as Challenge;
}

async function handleComplete() {
  if (!challenge.value) return;
  await store.complete(challenge.value.id, savedAmount.value);
  const { data: report } = await api.reports.generate(challenge.value.id);
  await router.push(`/report/${report.id}`);
}
</script>
