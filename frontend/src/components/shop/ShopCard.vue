<template>
  <div
    class="shop-card block rounded border border-arcade-border bg-arcade-dim overflow-hidden group"
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
        <div v-else class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
      </div>

      <!-- 信息区 -->
      <div class="flex-1 min-w-0">
        <!-- 店名 + 评分 -->
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-sm font-bold text-white truncate" data-testid="shop-name">
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
          >{{ dt }}</span>
        </div>

        <!-- 具体优惠文案 -->
        <div v-if="discountDetails.length" class="space-y-0.5" data-testid="shop-discount-details">
          <p
            v-for="detail in discountDetails.slice(0, 2)"
            :key="detail"
            class="text-xs text-arcade-green"
          >{{ detail }}</p>
        </div>

        <!-- 人均 + 来源 -->
        <div class="flex items-center gap-2 mt-1">
          <span v-if="shop.avgPrice" class="text-xs text-arcade-muted">
            人均 <span class="text-arcade-gold font-bold">¥{{ shop.avgPrice }}</span>
          </span>
          <span v-if="shop.source === 'amap'" class="text-xs text-arcade-blue/70 border border-arcade-blue/30 px-1 rounded">高德实时</span>
          <span v-else-if="shop.platform === 'dianping'" class="text-xs text-orange-400/70 border border-orange-400/30 px-1 rounded">大众点评</span>
          <span v-else-if="shop.platform === 'meituan'" class="text-xs text-yellow-400/70 border border-yellow-400/30 px-1 rounded">美团</span>
        </div>
      </div>
    </div>

    <!-- 一键行动栏 -->
    <div class="flex border-t border-arcade-border/50 divide-x divide-arcade-border/50" data-testid="shop-actions">
      <button
        @click="openDianping"
        class="flex-1 py-2 text-xs text-center text-orange-400 hover:bg-orange-400/10 transition-colors"
        title="大众点评"
      >📖 点评</button>
      <button
        @click="openMeituan"
        class="flex-1 py-2 text-xs text-center text-yellow-400 hover:bg-yellow-400/10 transition-colors"
        title="美团预约"
      >🛵 美团</button>
      <button
        @click="openNav"
        class="flex-1 py-2 text-xs text-center text-arcade-green hover:bg-arcade-green/10 transition-colors"
        title="高德导航"
      >🗺️ 导航</button>
      <button
        @click="openDouyin"
        class="flex-1 py-2 text-xs text-center text-pink-400 hover:bg-pink-400/10 transition-colors"
        title="抖音团购"
      >🎵 抖音</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface ShopRecommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string | null;
  district: string;
  lat?: number;
  lng?: number;
  distance: number;
  distanceText: string;
  avgPrice: number | null;
  rating: number | null;
  discountTypes: string[];
  discounts: Record<string, string>;
  externalUrl: string | null;
  meituanUrl?: string | null;
  dianpingUrl?: string | null;
  amapNavUrl?: string | null;
  platform: 'dianping' | 'meituan' | 'amap' | 'unknown';
  openHours: Record<string, string>;
  source?: 'db' | 'amap';
}

const props = defineProps<{ shop: ShopRecommendation }>();

const discountDetails = computed(() => Object.values(props.shop.discounts ?? {}));

function openDianping() {
  const url = props.shop.dianpingUrl ?? props.shop.externalUrl
    ?? `https://m.dianping.com/search/keyword/1/0_${encodeURIComponent(props.shop.name)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openMeituan() {
  const url = props.shop.meituanUrl
    ?? `https://h5.waimai.meituan.com/waimai/mindex/home?q=${encodeURIComponent(props.shop.name)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openNav() {
  const url = props.shop.amapNavUrl
    ?? `https://uri.amap.com/navigation?to=${props.shop.lng},${props.shop.lat},${encodeURIComponent(props.shop.name)}&mode=walk&callnative=0`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openDouyin() {
  const url = `https://www.douyin.com/search/${encodeURIComponent(props.shop.name + ' 上海龙华')}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

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
