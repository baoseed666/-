<template>
  <div class="min-h-screen px-4 pt-6 max-w-lg mx-auto pb-10">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">📊 数据看板</h2>
    </div>

    <div class="flex gap-2 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="[
          'flex-1 py-2 px-3 rounded text-sm font-bold tracking-wide transition-colors',
          activeTab === tab.key ? 'bg-arcade-gold text-black' : 'text-arcade-muted border border-arcade-border hover:text-white'
        ]"
      >{{ tab.label }}</button>
    </div>

    <!-- 用户视角 -->
    <div v-if="activeTab === 'user'" class="space-y-4">
      <div v-if="userLoading" class="text-arcade-muted text-center py-8">加载中...</div>
      <template v-else-if="me">
        <div class="card-arcade text-center">
          <p class="text-arcade-muted text-xs tracking-widest mb-1">当前段位</p>
          <p class="text-arcade-gold text-3xl font-bold tracking-wider mb-3">{{ me.rankTitle }}</p>
          <div class="flex justify-around">
            <div>
              <p class="text-arcade-green text-2xl font-bold">¥{{ animatedSaved }}</p>
              <p class="text-arcade-muted text-xs">累计省钱</p>
            </div>
            <div>
              <p class="text-arcade-gold text-2xl font-bold">{{ me.points }}</p>
              <p class="text-arcade-muted text-xs">积分余额</p>
            </div>
          </div>
        </div>

        <div class="card-arcade">
          <div class="flex justify-between items-center mb-3">
            <p class="text-white text-sm font-bold">段位进度</p>
            <p class="text-arcade-muted text-xs">{{ nextRankLabel }}</p>
          </div>
          <div class="w-full bg-gray-800 rounded-full h-2">
            <div class="bg-arcade-gold h-2 rounded-full transition-all duration-700" :style="{ width: rankProgress + '%' }"></div>
          </div>
          <p class="text-arcade-muted text-xs mt-1">再省 ¥{{ nextRankGap }} 升级</p>
        </div>

        <div class="card-arcade">
          <p class="text-white text-sm font-bold mb-3">近期挑战</p>
          <div v-if="challenges.length === 0" class="text-arcade-muted text-xs text-center py-4">暂无挑战记录</div>
          <div v-for="c in challenges.slice(0, 5)" :key="c.id" class="flex items-center gap-3 py-2 border-b border-arcade-border last:border-0">
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs truncate">{{ c.inputText }}</p>
              <p class="text-arcade-muted text-xs">{{ formatDate(c.createdAt) }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-arcade-green text-xs font-bold">¥{{ c.savedAmount?.toFixed(0) ?? 0 }}</p>
              <span :class="['text-xs', c.status === 'completed' ? 'text-arcade-gold' : 'text-arcade-muted']">{{ statusLabel(c.status) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 街道视角 -->
    <div v-if="activeTab === 'street'" class="space-y-4">
      <div class="card-arcade text-center">
        <p class="text-arcade-muted text-xs tracking-widest mb-1">今日全城</p>
        <p class="text-arcade-green text-3xl font-bold">¥{{ animatedStreetSaved }}</p>
        <p class="text-arcade-muted text-xs mt-1">总省钱金额</p>
      </div>

      <div class="card-arcade">
        <p class="text-white text-sm font-bold mb-3">今日活跃用户</p>
        <p class="text-arcade-gold text-2xl font-bold">{{ streetStats.todayCount }} <span class="text-arcade-muted text-sm font-normal">人</span></p>
      </div>

      <div class="card-arcade">
        <p class="text-white text-sm font-bold mb-3">最热商圈排行</p>
        <div v-for="(zone, i) in hotZones" :key="zone.name" class="flex items-center gap-3 py-2 border-b border-arcade-border last:border-0">
          <span :class="['text-lg font-bold w-6 text-center', i === 0 ? 'text-arcade-gold' : i === 1 ? 'text-white' : 'text-arcade-muted']">#{{ i + 1 }}</span>
          <div class="flex-1">
            <p class="text-white text-sm">{{ zone.name }}</p>
            <div class="w-full bg-gray-800 rounded-full h-1 mt-1">
              <div class="bg-arcade-green h-1 rounded-full" :style="{ width: (zone.count / hotZones[0].count * 100) + '%' }"></div>
            </div>
          </div>
          <p class="text-arcade-green text-sm font-bold">{{ zone.count }} 人</p>
        </div>
      </div>

      <div class="card-arcade">
        <p class="text-white text-sm font-bold mb-3">实时动态</p>
        <div class="space-y-2">
          <div v-for="msg in liveMessages" :key="msg" class="flex items-center gap-2 py-1">
            <span class="w-2 h-2 rounded-full bg-arcade-green shrink-0 animate-pulse"></span>
            <p class="text-arcade-muted text-xs">{{ msg }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 商户视角 -->
    <div v-if="activeTab === 'merchant'" class="space-y-4">
      <div v-for="merchant in merchants" :key="merchant.name" class="card-arcade">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="text-white font-bold">{{ merchant.name }}</p>
            <p class="text-arcade-muted text-xs">{{ merchant.category }}</p>
          </div>
          <span class="text-arcade-gold text-lg">{{ merchant.icon }}</span>
        </div>
        <div class="flex justify-around text-center">
          <div>
            <p class="text-arcade-gold font-bold">{{ merchant.visitors }}</p>
            <p class="text-arcade-muted text-xs">今日访客</p>
          </div>
          <div>
            <p class="text-white font-bold">{{ merchant.discounts }}</p>
            <p class="text-arcade-muted text-xs">折扣使用</p>
          </div>
          <div>
            <p class="text-arcade-green font-bold">¥{{ merchant.totalSaved }}</p>
            <p class="text-arcade-muted text-xs">省钱总额</p>
          </div>
        </div>
      </div>

      <router-link to="/opc" class="btn-arcade w-full justify-center block text-center">
        🚀 发布OPC任务
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '../api/client';

type Tab = 'user' | 'street' | 'merchant';

interface Me {
  nickname: string;
  totalSaved: number;
  rankTitle: string;
  points: number;
}

interface Challenge {
  id: string;
  inputText: string;
  status: string;
  savedAmount: number;
  pointsEarned: number;
  createdAt: string;
}

const tabs = [
  { key: 'user' as Tab, label: '👤 用户视角' },
  { key: 'street' as Tab, label: '🏙️ 街道视角' },
  { key: 'merchant' as Tab, label: '🏪 商户视角' },
];

const activeTab = ref<Tab>('user');
const userLoading = ref(false);
const me = ref<Me | null>(null);
const challenges = ref<Challenge[]>([]);

const streetStats = ref({ todayCount: 128, todayTotalSaved: 6842 });

const hotZones = ref([
  { name: '龙华会', count: 54 },
  { name: '西岸梦中心', count: 41 },
  { name: '西岸凤巢', count: 33 },
]);

const liveMessages = ref([
  '小红帽 刚在龙华会省了¥38',
  '省钱侠X 刚在西岸梦中心省了¥62',
  '抠门达人 刚在西岸凤巢省了¥25',
]);

const merchants = [
  { name: 'MANNER咖啡', category: '咖啡饮品', icon: '☕', visitors: 87, discounts: 63, totalSaved: 1260 },
  { name: '瓦屋川菜', category: '正餐', icon: '🥘', visitors: 52, discounts: 38, totalSaved: 2840 },
  { name: '趁烧火锅', category: '火锅', icon: '🍲', visitors: 74, discounts: 55, totalSaved: 4370 },
];

const rankLevels = [
  { title: '抠门新手', threshold: 0 },
  { title: '省钱学徒', threshold: 100 },
  { title: '节流高手', threshold: 500 },
  { title: '抠门大师', threshold: 1000 },
  { title: '省钱之神', threshold: 5000 },
];

const nextRankLabel = computed(() => {
  if (!me.value) return '';
  const saved = me.value.totalSaved;
  const next = rankLevels.find((r) => r.threshold > saved);
  return next ? next.title : '已达最高段位';
});

const nextRankGap = computed(() => {
  if (!me.value) return 0;
  const saved = me.value.totalSaved;
  const next = rankLevels.find((r) => r.threshold > saved);
  return next ? (next.threshold - saved).toFixed(0) : 0;
});

const rankProgress = computed(() => {
  if (!me.value) return 0;
  const saved = me.value.totalSaved;
  const current = [...rankLevels].reverse().find((r) => r.threshold <= saved);
  const next = rankLevels.find((r) => r.threshold > saved);
  if (!next || !current) return 100;
  return Math.min(100, ((saved - current.threshold) / (next.threshold - current.threshold)) * 100);
});

const animatedSaved = ref(0);
const animatedStreetSaved = ref(0);

function animateNumber(target: typeof animatedSaved, value: number) {
  const step = Math.ceil(value / 40);
  const interval = setInterval(() => {
    target.value = Math.min(target.value + step, value);
    if (target.value >= value) clearInterval(interval);
  }, 20);
}

function statusLabel(status: string) {
  const map: Record<string, string> = { completed: '已完成', pending: '进行中', failed: '未完成' };
  return map[status] ?? status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

async function loadUser() {
  userLoading.value = true;
  try {
    [me.value, challenges.value] = await Promise.all([
      api.users.getMe().then((r) => r.data),
      api.users.myChallenges().then((r) => r.data),
    ]);
    animateNumber(animatedSaved, me.value.totalSaved);
  } catch { /* ignore */ } finally {
    userLoading.value = false;
  }
}

async function loadStreet() {
  try {
    const data = (await api.leaderboard.cityStats('上海')).data as typeof streetStats.value;
    if (data?.todayCount) streetStats.value = data;
  } catch { /* ignore */ }
  animateNumber(animatedStreetSaved, streetStats.value.todayTotalSaved);
}

watch(activeTab, (tab) => {
  if (tab === 'user' && !me.value) loadUser();
  if (tab === 'street') {
    animatedStreetSaved.value = 0;
    loadStreet();
  }
});

onMounted(loadUser);
</script>
