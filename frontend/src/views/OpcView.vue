<template>
  <div class="min-h-screen px-4 py-6 max-w-2xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-arcade-gold tracking-widest">🏢 OPC任务市场</h1>
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">← 返回</router-link>
    </div>

    <div class="flex gap-2 mb-6 flex-wrap">
      <button v-for="tab in tabs" :key="tab.value"
        @click="activeTab = tab.value"
        :class="['px-3 py-1 rounded text-sm font-mono transition-colors border',
          activeTab === tab.value
            ? 'border-arcade-gold text-arcade-gold bg-yellow-900/20'
            : 'border-arcade-border text-arcade-muted hover:border-arcade-gold hover:text-arcade-gold']">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center text-arcade-muted py-16 text-sm">⚡ 加载中...</div>

    <div v-else-if="filteredTasks.length === 0" class="text-center text-arcade-muted py-16 text-sm">
      暂无可接单任务
    </div>

    <div v-else class="space-y-4">
      <div v-for="task in filteredTasks" :key="task.id" class="card-arcade">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono px-2 py-0.5 rounded border"
              :class="typeBadgeClass(task.taskType)">{{ task.taskType }}</span>
            <span class="text-arcade-muted text-xs">{{ task.merchantName }}</span>
          </div>
          <span class="text-arcade-gold font-bold text-lg shrink-0">+{{ task.pointsReward }}积分</span>
        </div>

        <h3 class="text-white font-semibold mb-1">{{ task.title }}</h3>
        <p class="text-arcade-muted text-sm leading-relaxed line-clamp-2 mb-3">{{ task.description }}</p>

        <button
          v-if="task.status === 'open'"
          @click="accept(task)"
          :disabled="accepting === task.id"
          class="btn-arcade text-sm">
          {{ accepting === task.id ? '接单中...' : '⚡ 接单' }}
        </button>
        <span v-else class="text-xs text-arcade-muted border border-arcade-border rounded px-3 py-1 inline-block">已被接单</span>
      </div>
    </div>

    <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-arcade-gold text-black text-sm font-bold px-5 py-3 rounded shadow-lg z-50">
      {{ toast }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../api/client';

interface OpcTask {
  id: string;
  merchantName: string;
  taskType: string;
  title: string;
  description: string;
  pointsReward: number;
  status: string;
}

const tabs = [
  { label: '全部', value: '' },
  { label: '📷 摄影', value: '摄影' },
  { label: '✍️ 内容', value: '内容' },
  { label: '🗺️ 导览', value: '导览' },
];

const tasks = ref<OpcTask[]>([]);
const loading = ref(true);
const activeTab = ref('');
const accepting = ref('');
const toast = ref('');

const filteredTasks = computed(() =>
  activeTab.value ? tasks.value.filter((t) => t.taskType === activeTab.value) : tasks.value,
);

function typeBadgeClass(type: string) {
  if (type === '摄影') return 'border-blue-400 text-blue-400';
  if (type === '内容') return 'border-arcade-green text-arcade-green';
  return 'border-purple-400 text-purple-400';
}

async function loadTasks() {
  loading.value = true;
  try {
    const res = await api.opc.getTasks();
    tasks.value = res.data as OpcTask[];
  } finally {
    loading.value = false;
  }
}

async function accept(task: OpcTask) {
  accepting.value = task.id;
  try {
    await api.opc.acceptTask(task.id);
    task.status = 'taken';
    showToast(`接单成功！+${task.pointsReward}积分已到账`);
  } catch {
    showToast('接单失败，请稍后重试');
  } finally {
    accepting.value = '';
  }
}

function showToast(msg: string) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 3000);
}

onMounted(loadTasks);
</script>
