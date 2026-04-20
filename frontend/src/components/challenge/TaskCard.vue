<template>
  <div :class="['card-arcade task-badge-' + task.type, 'transition-all duration-300', task.status === 'done' ? 'opacity-60' : '']">
    <!-- 任务头部 -->
    <div class="flex justify-between items-start mb-2">
      <div>
        <span :class="badgeClass" class="text-xs tracking-widest px-2 py-0.5 rounded border">{{ typeLabel }}</span>
      </div>
      <button v-if="task.status === 'pending'" @click="$emit('complete', task.id)"
        class="text-xs text-arcade-green border border-arcade-green px-2 py-0.5 rounded hover:bg-arcade-green hover:text-arcade-black transition-colors">
        ✓ 完成
      </button>
      <span v-else class="text-xs text-arcade-muted">{{ task.status === 'done' ? '✓ 已完成' : '跳过' }}</span>
    </div>

    <!-- 任务描述 -->
    <p class="text-sm text-white mb-2">{{ task.description }}</p>

    <!-- 技巧提示 -->
    <ul v-if="task.tips?.length" class="space-y-1 mb-3">
      <li v-for="tip in task.tips" :key="tip" class="text-xs text-arcade-muted flex gap-1">
        <span class="text-arcade-gold">›</span> {{ tip }}
      </li>
    </ul>

    <!-- 旧式单店（兼容） -->
    <p v-if="task.shop?.name && !hasShopRecs" class="text-xs text-arcade-green mt-2">📍 {{ task.shop.name }}</p>

    <!-- AI推荐店铺列表 -->
    <div v-if="hasShopRecs" class="mt-3" data-testid="shop-recommendations">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-arcade-gold font-bold tracking-widest">⚡ 推荐省钱店铺</span>
        <span class="text-xs text-arcade-muted">（{{ task.shopRecommendations!.length }}家，按距离排序）</span>
      </div>
      <div class="space-y-2">
        <ShopCard
          v-for="shop in task.shopRecommendations"
          :key="shop.id"
          :shop="shop"
        />
      </div>
    </div>

    <!-- 无推荐时的提示（主线任务） -->
    <div v-else-if="task.type === 'main'" class="mt-2 text-xs text-arcade-muted italic" data-testid="no-shops-hint">
      💡 位置未知或该城市暂无店铺数据，请手动搜索
    </div>

    <!-- 行动按钮 -->
    <div v-if="task.actionLinks?.length" class="flex flex-wrap gap-2 mt-3">
      <a
        v-for="link in task.actionLinks"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener"
        class="text-xs px-3 py-1 rounded border border-arcade-gold text-arcade-gold hover:bg-arcade-gold hover:text-arcade-black transition-colors"
      >{{ actionIcon(link.type) }} {{ link.label }}</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ShopCard, { type ShopRecommendation } from '../shop/ShopCard.vue';

interface ActionLink {
  type: string;
  label: string;
  url: string;
}

interface Task {
  id: string;
  type: string;
  status: string;
  description: string;
  tips?: string[];
  shop?: { name: string };
  shopRecommendations?: ShopRecommendation[];
  actionLinks?: ActionLink[];
}

const props = defineProps<{ task: Task }>();
defineEmits<{ (e: 'complete', id: string): void }>();

const hasShopRecs = computed(() => (props.task.shopRecommendations?.length ?? 0) > 0);

const typeLabel = computed(() => ({ main: '🎯 主线任务', side: '⚡ 支线任务', hidden: '🏆 隐藏成就' }[props.task.type as 'main' | 'side' | 'hidden'] ?? props.task.type));
const badgeClass = computed(() => ({ main: 'border-arcade-green text-arcade-green', side: 'border-arcade-gold text-arcade-gold', hidden: 'border-arcade-blue text-arcade-blue' }[props.task.type as 'main' | 'side' | 'hidden'] ?? ''));

function actionIcon(type: string) {
  return { book: '📅', nav: '🗺️', group: '👥', student: '🎓', search: '🔍' }[type] ?? '🔗';
}
</script>
