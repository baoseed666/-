<template>
  <div class="min-h-screen px-4 pt-6 pb-24 max-w-lg mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold text-xl">‹</router-link>
      <h2 class="text-arcade-gold font-bold tracking-widest">我的</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card-arcade text-center text-arcade-muted py-12">加载中...</div>

    <!-- Not logged in -->
    <div v-else-if="!authStore.isLoggedIn" class="flex flex-col items-center justify-center py-24 gap-6">
      <div class="text-6xl">🔒</div>
      <p class="text-arcade-muted">请先登录查看个人资料</p>
      <router-link to="/login" class="btn-arcade-primary px-8">去登录</router-link>
    </div>

    <!-- Profile content -->
    <template v-else>
      <!-- User card -->
      <div class="card-arcade flex items-center gap-4 mb-4">
        <div class="avatar-circle">{{ avatarChar }}</div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-lg truncate">{{ user?.nickname || '抠门玩家' }}</div>
          <div class="text-arcade-gold text-sm">{{ user?.rankTitle || '消费韭菜' }}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-arcade-gold font-bold text-2xl">{{ user?.points || 0 }}</div>
          <div class="text-arcade-muted text-xs">积分</div>
        </div>
      </div>

      <!-- Stat cards 2-col grid -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="card-arcade">
          <div class="text-2xl mb-1">💰</div>
          <div class="font-bold text-sm mb-2">省钱专家</div>
          <div class="text-arcade-green font-bold text-2xl">¥{{ formatAmount(user?.totalSaved) }}</div>
          <div class="text-arcade-muted text-xs mb-2">累计节省</div>
          <div class="border-t border-arcade-border pt-2 text-arcade-muted text-xs">
            共 {{ history.length }} 次挑战
          </div>
        </div>
        <div class="card-arcade">
          <div class="text-2xl mb-1">🏆</div>
          <div class="font-bold text-sm mb-2">挑战记录</div>
          <div class="text-arcade-gold font-bold text-2xl">{{ recentCount }}</div>
          <div class="text-arcade-muted text-xs mb-2">近7日挑战</div>
          <div class="border-t border-arcade-border pt-2 text-arcade-muted text-xs truncate">
            {{ user?.rankTitle || '消费韭菜' }}
          </div>
        </div>
      </div>

      <!-- Challenge history -->
      <div v-if="history.length" class="mb-4">
        <h3 class="font-bold mb-3 text-sm tracking-wide">历史挑战</h3>
        <div
          v-for="item in history"
          :key="item.id"
          class="card-arcade flex items-start gap-3 mb-2"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm text-white truncate">{{ item.inputText }}</div>
            <div class="flex items-center gap-2 mt-1">
              <span :class="statusClass(item.status)" class="status-badge">
                {{ statusLabel(item.status) }}
              </span>
              <span class="text-arcade-muted text-xs">{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-arcade-green font-bold text-sm">+¥{{ formatAmount(item.savedAmount) }}</div>
            <div class="text-arcade-gold text-xs">+{{ item.pointsEarned || 0 }}分</div>
          </div>
        </div>
      </div>

      <div v-else class="card-arcade text-center text-arcade-muted text-sm py-6 mb-4">
        还没有挑战记录，快去开始吧！
      </div>

      <!-- Logout -->
      <button
        @click="logout"
        class="w-full border border-red-500 text-red-500 rounded-lg py-3 font-bold hover:bg-red-500 hover:text-black transition-colors"
      >
        退出登录
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

interface UserProfile {
  id: string
  nickname: string
  avatarUrl: string | null
  totalSaved: number
  rankTitle: string
  points: number
}

interface ChallengeItem {
  id: string
  inputText: string
  status: string
  savedAmount: number
  pointsEarned: number
  createdAt: string
}

const user = ref<UserProfile | null>(null)
const history = ref<ChallengeItem[]>([])
const loading = ref(true)

const avatarChar = computed(() => {
  const name = user.value?.nickname || '?'
  return name.charAt(0).toUpperCase()
})

const recentCount = computed(() => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return history.value.filter(c => new Date(c.createdAt).getTime() > weekAgo).length
})

function formatAmount(val: number | null | undefined): string {
  const n = parseFloat(String(val ?? 0)) || 0
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function statusLabel(status: string): string {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '未完成'
  return '进行中'
}

function statusClass(status: string): string {
  if (status === 'completed') return 'status-done'
  if (status === 'failed') return 'status-fail'
  return 'status-active'
}

async function loadProfile() {
  try {
    const [meRes, challengesRes] = await Promise.all([
      api.users.getMe(),
      api.users.myChallenges(),
    ])
    user.value = meRes.data
    const list: ChallengeItem[] = Array.isArray(challengesRes.data)
      ? challengesRes.data
      : (challengesRes.data as any).list ?? []
    history.value = list.slice(0, 10)
  } catch {
    authStore.logout()
  } finally {
    loading.value = false
  }
}

function logout() {
  if (confirm('确认退出登录？')) {
    authStore.logout()
    router.push('/')
  }
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    loadProfile()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ffdd00;
  color: #000;
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-done {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.status-fail {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.status-active {
  background: rgba(255, 221, 0, 0.15);
  color: #ffdd00;
}
</style>
