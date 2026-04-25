<template>
  <div class="flex flex-col" style="height: calc(100vh - 4rem)">
    <div class="flex items-center justify-center shrink-0 bg-[#0a0a0a] border-b border-arcade-border" style="height: 3rem">
      <h1 class="text-arcade-gold font-bold text-base leading-none">没钱？也要有满满的一天</h1>
    </div>
    <div ref="mapEl" class="flex-1 w-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../api/client';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

interface Shop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  neighborhood?: string;
  avgPrice?: number;
  rating?: number;
  discount?: string;
}

const NEIGHBORHOOD_COLORS: Record<string, string> = {
  '龙华会': '#ffdd00',
  '西岸凤巢': '#00ff88',
  '西岸梦中心': '#4488ff',
  '朵云轩': '#ff88cc',
  '滨江步道': '#ff8844',
};

const FALLBACK_MARKERS: { name: string; lat: number; lng: number; neighborhood: string }[] = [
  { name: '龙华会', lat: 31.1835, lng: 121.456, neighborhood: '龙华会' },
  { name: '西岸凤巢', lat: 31.178, lng: 121.452, neighborhood: '西岸凤巢' },
  { name: '西岸梦中心', lat: 31.182, lng: 121.461, neighborhood: '西岸梦中心' },
  { name: '朵云轩', lat: 31.186, lng: 121.458, neighborhood: '朵云轩' },
  { name: '滨江步道', lat: 31.180, lng: 121.465, neighborhood: '滨江步道' },
];

const mapEl = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;

function coloredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 6px ${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function addShopMarker(shop: Shop) {
  if (!map) return;
  const color = NEIGHBORHOOD_COLORS[shop.neighborhood ?? ''] ?? '#aaaaaa';
  const icon = coloredIcon(color);
  const lines: string[] = [`<strong>${shop.name}</strong>`];
  if (shop.avgPrice != null) lines.push(`人均 ¥${shop.avgPrice}`);
  if (shop.rating != null) lines.push(`评分 ${shop.rating}`);
  if (shop.discount) lines.push(`折扣 ${shop.discount}`);
  L.marker([shop.lat, shop.lng], { icon })
    .addTo(map)
    .bindPopup(lines.join('<br>'));
}

function addFallbackMarkers() {
  FALLBACK_MARKERS.forEach(m => {
    if (!map) return;
    const color = NEIGHBORHOOD_COLORS[m.neighborhood] ?? '#aaaaaa';
    L.marker([m.lat, m.lng], { icon: coloredIcon(color) })
      .addTo(map)
      .bindPopup(`<strong>${m.name}</strong>`);
  });
}

onMounted(async () => {
  if (!mapEl.value) return;

  map = L.map(mapEl.value, { center: [31.18, 121.455], zoom: 15 });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  try {
    const res = await api.shops.search('上海', { limit: '100' });
    const shops: Shop[] = res.data?.data ?? res.data ?? [];
    if (shops.length === 0) {
      addFallbackMarkers();
    } else {
      shops.forEach(addShopMarker);
    }
  } catch {
    addFallbackMarkers();
  }
});

onUnmounted(() => {
  map?.remove();
  map = null;
});
</script>
