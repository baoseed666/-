<template>
  <a
    :href="shop.externalUrl ?? '#'"
    :target="shop.externalUrl ? '_blank' : '_self'"
    rel="noopener noreferrer"
    class="shop-card block rounded border border-arcade-border bg-arcade-dim hover:border-arcade-gold transition-all duration-200 overflow-hidden group"
    data-testid="shop-card"
  >
    <div class="flex gap-3 p-3">
      <!-- 封面图 -->
      <div class="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-arcade-border">
        <img
          v-if="shop.imageUrl"
          :src="shop.imageUrl"
          :alt="shop.name"
          class="w-full h-full object-cover"
          @error="onImgError"
          data-testid="shop-image"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-2xl">
          🍽️
        </div>
      </div>

      <!-- 信息区 -->
      <div class="flex-1 min-w-0">
        <!-- 店名 + 评分 -->
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-sm font-bold text-white truncate group-hover:text-arcade-gold transition-colors" data-testid="shop-name">
            {{ shop.name }}
          </span>
          <span v-if="shop.rating" class="flex-shrink-0 text-xs text-arcade-gold font-bold" data-testid="shop-rating">
            ★ {{ Number(shop.rating).toFixed(1) }}
          </span>
        </div>

        <!-- 地址 + 距离 -->
        <div class="flex items-center gap-1 text-xs text-arcade-muted mb-1.5" data-testid="shop-address">
          <span class="text-arcade-green">📍</span>
          <span class="truncate">{{ shop.address ?? shop.district }}</span>
          <span v-if="shop.distanceText && shop.distanceText !== '位置未知'" class="flex-shrink-0 text-arcade-blue font-medium">
            · {{ shop.distanceText }}
          </span>
        </div>

        <!-- 优惠类型标签 -->
        <div v-if="shop.discountTypes?.length" class="flex flex-wrap gap-1 mb-1" data-testid="shop-discount-types">
          <span
            v-for="dt in shop.discountTypes"
            :key="dt"
            :class="discountBadgeClass(dt)"
            class="text-xs px-1.5 py-0.5 rounded border font-medium"
          >
            {{ dt }}
          </span>
        </div>

        <!-- 具体优惠文案 -->
        <div v-if="discountDetails.length" class="space-y-0.5" data-testid="shop-discount-details">
          <p
            v-for="detail in discountDetails.slice(0, 2)"
            :key="detail"
            class="text-xs text-arcade-green"
          >
            {{ detail }}
          </p>
        </div>
      </div>

      <!-- 右箭头 + 平台标识 -->
      <div class="flex-shrink-0 flex flex-col items-center justify-between py-1">
        <span :class="platformBadge.cls" class="text-xs px-1 py-0.5 rounded font-bold" data-testid="shop-platform">
          {{ platformBadge.label }}
        </span>
        <span class="text-arcade-muted text-sm group-hover:text-arcade-gold transition-colors">›</span>
      </div>
    </div>

    <!-- 人均价格 -->
    <div v-if="shop.avgPrice" class="px-3 pb-2 text-xs text-arcade-muted">
      人均 <span class="text-arcade-gold font-bold">¥{{ shop.avgPrice }}</span>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface ShopRecommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string | null;
  district: string;
  distance: number;
  distanceText: string;
  avgPrice: number | null;
  rating: number | null;
  discountTypes: string[];
  discounts: Record<string, string>;
  externalUrl: string | null;
  platform: 'dianping' | 'meituan' | 'unknown';
  openHours: Record<string, string>;
}

const props = defineProps<{ shop: ShopRecommendation }>();

const discountDetails = computed(() => Object.values(props.shop.discounts ?? {}));

const platformBadge = computed(() => {
  if (props.shop.platform === 'dianping') return { label: '点评', cls: 'text-orange-400 border border-orange-400/40 bg-orange-400/10' };
  if (props.shop.platform === 'meituan') return { label: '美团', cls: 'text-yellow-400 border border-yellow-400/40 bg-yellow-400/10' };
  return { label: '外链', cls: 'text-arcade-muted border border-arcade-border' };
});

function discountBadgeClass(dt: string) {
  if (dt === '神券') return 'border-red-400/60 text-red-400 bg-red-400/10';
  if (dt === '团购') return 'border-arcade-green/60 text-arcade-green bg-arcade-green/10';
  if (dt === '促销') return 'border-arcade-blue/60 text-arcade-blue bg-arcade-blue/10';
  return 'border-arcade-border text-arcade-muted';
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  img.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>';
}
</script>
