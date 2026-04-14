import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from './auth.store';

export const useChallengeStore = defineStore('challenge', () => {
  const current = ref<unknown>(null);
  const streaming = ref(false);
  const streamChunks = ref<string[]>([]);

  async function create(rawText: string, city: string) {
    const { data } = await api.challenges.create(rawText, city);
    return data;
  }

  async function startStream(challengeId: string, onChunk: (chunk: string) => void, onComplete: () => void) {
    streaming.value = true;
    streamChunks.value = [];
    const auth = useAuthStore();
    const url = api.challenges.streamUrl(challengeId);

    const es = new EventSource(`${url}?token=${auth.accessToken}`);
    es.addEventListener('task_chunk', (e) => {
      const { chunk } = JSON.parse((e as MessageEvent).data) as { chunk: string };
      streamChunks.value.push(chunk);
      onChunk(chunk);
    });
    es.addEventListener('complete', () => {
      streaming.value = false;
      es.close();
      onComplete();
    });
    es.onerror = () => { streaming.value = false; es.close(); };
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

  return { current, streaming, streamChunks, create, startStream, load, updateTask, complete };
});
