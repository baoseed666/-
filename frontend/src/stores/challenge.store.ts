import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from './auth.store';
import type { CityPulseData } from '../components/city/CityPulseBar.vue';
import type { ShopRecommendation } from '../components/shop/ShopCard.vue';
import type { WalkingRoute } from '../components/city/RouteCard.vue';

export const useChallengeStore = defineStore('challenge', () => {
  const current = ref<unknown>(null);
  const streaming = ref(false);
  const streamChunks = ref<string[]>([]);
  const cityPulse = ref<CityPulseData | null>(null);
  const actionQuery = ref<{ category: string; city: string; hasGps: boolean } | null>(null);
  const shopMatches = ref<Record<number, ShopRecommendation[]>>({});
  const route = ref<{ shopId: string; route: WalkingRoute } | null>(null);

  async function create(rawText: string) {
    const { data } = await api.challenges.create(rawText);
    return data;
  }

  async function startStream(
    challengeId: string,
    lat: number | undefined,
    lng: number | undefined,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
  ) {
    streaming.value = true;
    streamChunks.value = [];
    cityPulse.value = null;
    actionQuery.value = null;
    shopMatches.value = {};
    route.value = null;

    const auth = useAuthStore();
    const url = api.challenges.streamUrl(challengeId, lat, lng);
    const sep = url.includes('?') ? '&' : '?';
    const es = new EventSource(`${url}${sep}token=${auth.accessToken}`);

    es.addEventListener('city_pulse', (e) => {
      cityPulse.value = JSON.parse((e as MessageEvent).data);
    });
    es.addEventListener('action_query', (e) => {
      actionQuery.value = JSON.parse((e as MessageEvent).data);
    });
    es.addEventListener('task_chunk', (e) => {
      const { chunk } = JSON.parse((e as MessageEvent).data) as { chunk: string };
      streamChunks.value.push(chunk);
      onChunk(chunk);
    });
    es.addEventListener('shop_matched', (e) => {
      const { taskIndex, shops } = JSON.parse((e as MessageEvent).data) as {
        taskIndex: number;
        shops: ShopRecommendation[];
      };
      shopMatches.value = { ...shopMatches.value, [taskIndex]: shops };
    });
    es.addEventListener('booking_ready', () => {
      // booking URLs are embedded in shop.externalUrl — no extra state needed
    });
    es.addEventListener('route_ready', (e) => {
      route.value = JSON.parse((e as MessageEvent).data);
    });
    es.addEventListener('complete', () => {
      streaming.value = false;
      es.close();
      onComplete();
    });
    es.onerror = () => {
      streaming.value = false;
      es.close();
    };
  }

  async function load(id: string) {
    const { data } = await api.challenges.get(id);
    current.value = data;
    return data;
  }

  async function updateTask(challengeId: string, taskId: string, status: string) {
    await api.challenges.updateTask(challengeId, taskId, status);
    await load(challengeId);
  }

  async function complete(challengeId: string, savedAmount: number) {
    const { data } = await api.challenges.complete(challengeId, savedAmount);
    return data;
  }

  return {
    current, streaming, streamChunks,
    cityPulse, actionQuery, shopMatches, route,
    create, startStream, load, updateTask, complete,
  };
});
