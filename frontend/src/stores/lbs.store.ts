import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';

export const useLBSStore = defineStore('lbs', () => {
  const socket = ref<Socket | null>(null);
  const status = ref<'idle' | 'waiting' | 'matched'>('idle');
  const matchedUserId = ref<string | null>(null);

  function connect() {
    socket.value = io(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/lbs`);
    socket.value.on('matched', (data: { matchedUserId: string }) => {
      status.value = 'matched';
      matchedUserId.value = data.matchedUserId;
    });
    socket.value.on('waiting', () => { status.value = 'waiting'; });
    socket.value.on('cancelled', () => { status.value = 'idle'; });
  }

  function requestMatch(userId: string, lat: number, lng: number, tags: string[], shopId?: string) {
    if (!socket.value) connect();
    status.value = 'waiting';
    socket.value!.emit('request-match', { userId, lat, lng, tags, shopId });
  }

  function cancel(userId: string) {
    socket.value?.emit('cancel-match', { userId });
    status.value = 'idle';
  }

  return { status, matchedUserId, requestMatch, cancel };
});
