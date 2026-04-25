import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './shop.entity';
import { AmapService, AmapPOI } from '../transit/amap.service';
import { BaiduService } from '../transit/baidu.service';

export interface ShopRecommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string | null;
  district: string;
  lat: number;
  lng: number;
  distance: number;
  distanceText: string;
  avgPrice: number | null;
  rating: number | null;
  discountTypes: string[];
  discounts: Record<string, string>;
  externalUrl: string | null;
  meituanUrl: string | null;
  dianpingUrl: string | null;
  amapNavUrl: string | null;
  platform: 'dianping' | 'meituan' | 'amap' | 'unknown';
  openHours: Record<string, string>;
  openTime?: string;
  source: 'db' | 'amap' | 'baidu';
}

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop) private readonly repo: Repository<Shop>,
    private readonly amap: AmapService,
    private readonly baidu: BaiduService,
  ) {}

  async search(opts: {
    city: string;
    category?: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<Shop[]> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.city = :city', { city: opts.city });
    if (opts.category) qb.andWhere('s.category = :cat', { cat: opts.category });
    if (opts.lat && opts.lng) {
      qb.addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(s.lat::float)) * cos(radians(s.lng::float) - radians(:lng)) + sin(radians(:lat)) * sin(radians(s.lat::float))))`,
        'distance',
      )
        .setParameters({ lat: opts.lat, lng: opts.lng })
        .orderBy('distance', 'ASC');
    } else {
      qb.orderBy('s.rating', 'DESC');
    }
    return qb.limit(opts.limit ?? 20).getMany();
  }

  findById(id: string) {
    return this.repo.findOneByOrFail({ id });
  }

  async recommendShops(opts: {
    city: string;
    category?: string;
    lat?: number;
    lng?: number;
    budget?: number;
    discountTypes?: string[];
    openNow?: boolean;
    limit?: number;
  }): Promise<ShopRecommendation[]> {
    let dbShops = await this.search({
      city: opts.city,
      category: opts.category,
      lat: opts.lat,
      lng: opts.lng,
      limit: 50,
    });

    if (dbShops.length === 0 && opts.category) {
      const qb = this.repo
        .createQueryBuilder('s')
        .where('s.city = :city', { city: opts.city })
        .andWhere('s.category ILIKE :catPattern', { catPattern: `%${opts.category}%` });
      if (opts.lat && opts.lng) {
        qb.addSelect(
          `(6371 * acos(cos(radians(:lat)) * cos(radians(s.lat::float)) * cos(radians(s.lng::float) - radians(:lng)) + sin(radians(:lat)) * sin(radians(s.lat::float))))`,
          'distance',
        )
          .setParameters({ lat: opts.lat, lng: opts.lng })
          .orderBy('distance', 'ASC');
      } else {
        qb.orderBy('s.rating', 'DESC');
      }
      dbShops = await qb.limit(50).getMany();
    }

    let filtered = dbShops;
    if (opts.budget && opts.budget > 0) {
      filtered = filtered.filter(
        (s) =>
          s.avgPrice === null ||
          parseFloat(s.avgPrice as unknown as string) <= opts.budget!,
      );
    }
    if (opts.discountTypes?.length) {
      filtered = filtered.filter((s) =>
        opts.discountTypes!.some((dt) => s.discountTypes?.includes(dt)),
      );
    }
    if (opts.openNow) {
      const hour = new Date().getHours();
      filtered = filtered.filter((s) => this.isOpenNow(s.openHours, hour));
    }

    const dbResults = filtered
      .slice(0, opts.limit ?? 5)
      .map((s) => this.toRecommendation(s, opts.lat, opts.lng));

    // 本地 DB 不足时，并行调用高德+百度 POI 补充
    const needed = (opts.limit ?? 5) - dbResults.length;
    if (needed > 0 && opts.lat && opts.lng && opts.category) {
      const poiResults = await this.fetchExternalPOI(
        opts.category,
        opts.lat,
        opts.lng,
        needed,
      );
      return [...dbResults, ...poiResults].sort((a, b) => a.distance - b.distance);
    }

    return dbResults;
  }

  async getContextShops(
    city: string,
    category: string,
    lat?: number,
    lng?: number,
  ): Promise<string> {
    const shops = await this.search({ city, category, lat, lng, limit: 15 });

    let lines: string[] = shops.map((s) => {
      const dist =
        lat && lng
          ? ` 距离${this.calcDistanceText(lat, lng, parseFloat(s.lat as any), parseFloat(s.lng as any))}`
          : '';
      const discountStr = s.discountTypes?.length
        ? s.discountTypes.join('/')
        : '无';
      return `• ${s.name}（${s.district}，人均¥${s.avgPrice ?? '未知'}，评分${s.rating ?? '?'}，优惠：${discountStr}${dist}）`;
    });

    if (lines.length < 5 && lat && lng) {
      const poiResults = await this.fetchExternalPOI(category, lat, lng, 10);
      const poiLines = poiResults.map(
        (r) => `• ${r.name}（${r.address || '附近'}，人均¥${r.avgPrice ?? '未知'}，评分${r.rating ?? '?'}，距离${r.distanceText}）[实时数据]`,
      );
      lines = [...lines, ...poiLines];
    }

    return lines.length === 0 ? '（当前城市暂无店铺数据）' : lines.join('\n');
  }

  async getRecommendationsForTask(
    city: string,
    category: string,
    lat?: number,
    lng?: number,
    budget?: number,
  ): Promise<ShopRecommendation[]> {
    return this.recommendShops({ city, category, lat, lng, budget, limit: 3 });
  }

  async findByHint(
    hint: string,
    city: string,
    lat?: number,
    lng?: number,
  ): Promise<ShopRecommendation | null> {
    const dbShop = await this.repo
      .createQueryBuilder('s')
      .where('s.city = :city', { city })
      .andWhere('s.name ILIKE :hint', { hint: `%${hint}%` })
      .getOne();
    if (dbShop) return this.toRecommendation(dbShop, lat, lng);

    if (lat && lng) {
      const pois = await this.amap.searchPOINearby({
        lat, lng, keywords: hint, radius: 5000, limit: 3,
      });
      if (pois.length > 0) return this.poiToRecommendation(pois[0], lat, lng, 'amap');
    }
    return null;
  }

  // ── Private helpers ──────────────────────────────────────────

  /** 并行调用高德 + 百度 POI，按店名去重后返回 */
  private async fetchExternalPOI(
    category: string,
    lat: number,
    lng: number,
    limit: number,
  ): Promise<ShopRecommendation[]> {
    const keyword = this.categoryToKeyword(category);
    const [amapPois, baiduPois] = await Promise.all([
      this.amap.searchPOINearby({ lat, lng, keywords: keyword, radius: 3000, limit }),
      this.baidu.searchPOINearby({ lat, lng, keywords: keyword, radius: 3000, limit }),
    ]);
    const seen = new Set<string>();
    return [
      ...amapPois.map((p) => this.poiToRecommendation(p, lat, lng, 'amap')),
      ...baiduPois.map((p) => this.poiToRecommendation(p, lat, lng, 'baidu')),
    ]
      .filter((r) => { const key = r.name.trim(); if (seen.has(key)) return false; seen.add(key); return true; })
      .slice(0, limit);
  }

  private categoryToKeyword(category: string): string {
    const map: Record<string, string> = {
      '咖啡奶茶': '咖啡|奶茶',
      '甜品蛋糕': '甜品|蛋糕',
      '火锅': '火锅',
      '烧烤烤肉': '烧烤|烤肉',
      '鱼鲜海鲜': '海鲜|鱼',
      '川湘菜': '川菜|湘菜',
      '粤菜': '粤菜|早茶',
      '江浙菜': '江浙菜',
      '日料': '日料|寿司',
      '韩料': '韩餐|韩式',
      '西餐': '西餐|牛排',
      '东南亚菜': '东南亚|泰国',
      '自助餐': '自助餐|buffet',
      'KTV': 'KTV|卡拉OK',
      '电影院': '电影院|影城',
      '桌游': '桌游|剧本杀',
      '密室逃脱': '密室逃脱',
      '购物': '购物|商场',
      '户外公园': '公园|户外',
      '小吃简餐': '餐厅|快餐',
    };
    return map[category] ?? category;
  }

  private poiToRecommendation(
    p: AmapPOI,
    userLat?: number,
    userLng?: number,
    source: 'amap' | 'baidu' = 'amap',
  ): ShopRecommendation {
    const distance =
      userLat && userLng ? this.haversine(userLat, userLng, p.lat, p.lng) : 0;
    const nameEnc = encodeURIComponent(p.name);
    return {
      id: `${source}_${p.id}`,
      name: p.name,
      imageUrl: p.photos?.[0] ?? null,
      address: p.address || null,
      district: p.address?.split('区')[0] + '区' || '附近',
      lat: p.lat,
      lng: p.lng,
      distance,
      distanceText: this.calcDistanceText(userLat ?? 0, userLng ?? 0, p.lat, p.lng),
      avgPrice: p.avgPrice ?? null,
      rating: p.rating ?? null,
      discountTypes: [],
      discounts: {},
      externalUrl: `https://m.dianping.com/search/keyword/1/0_${nameEnc}`,
      meituanUrl: `https://h5.waimai.meituan.com/waimai/mindex/home?city=${encodeURIComponent('上海')}&q=${nameEnc}`,
      dianpingUrl: `https://m.dianping.com/search/keyword/1/0_${nameEnc}`,
      amapNavUrl: `https://uri.amap.com/navigation?to=${p.lng},${p.lat},${nameEnc}&mode=walk&callnative=0`,
      platform: 'amap',
      openHours: p.openTime ? { weekday: p.openTime } : {},
      openTime: p.openTime,
      source,
    };
  }

  private toRecommendation(
    shop: Shop,
    userLat?: number,
    userLng?: number,
  ): ShopRecommendation {
    const lat = parseFloat(shop.lat as unknown as string);
    const lng = parseFloat(shop.lng as unknown as string);
    const distance =
      userLat && userLng ? this.haversine(userLat, userLng, lat, lng) : 0;

    const rawUrl = shop.externalUrl;
    const isFakePlaceholder =
      rawUrl &&
      (/\/shop\/sh_lh_\d+$/.test(rawUrl) ||
        /\/meishi\/sh_lh_\d+$/.test(rawUrl));
    const nameEnc = encodeURIComponent(shop.name);
    const dianpingUrl = isFakePlaceholder
      ? `https://m.dianping.com/search/keyword/1/0_${nameEnc}`
      : (rawUrl?.includes('dianping') ? rawUrl : `https://m.dianping.com/search/keyword/1/0_${nameEnc}`);
    const meituanUrl = rawUrl?.includes('meituan')
      ? rawUrl
      : `https://h5.waimai.meituan.com/waimai/mindex/home?q=${nameEnc}`;

    let platform: 'dianping' | 'meituan' | 'amap' | 'unknown' = 'unknown';
    if (rawUrl?.includes('dianping.com')) platform = 'dianping';
    else if (rawUrl?.includes('meituan.com')) platform = 'meituan';

    return {
      id: shop.id,
      name: shop.name,
      imageUrl: shop.imageUrl,
      address: shop.address,
      district: shop.district,
      lat,
      lng,
      distance,
      distanceText: this.calcDistanceText(userLat ?? 0, userLng ?? 0, lat, lng),
      avgPrice: shop.avgPrice ? parseFloat(shop.avgPrice as unknown as string) : null,
      rating: shop.rating ? parseFloat(shop.rating as unknown as string) : null,
      discountTypes: shop.discountTypes ?? [],
      discounts: shop.discounts ?? {},
      externalUrl: dianpingUrl,
      meituanUrl,
      dianpingUrl,
      amapNavUrl: `https://uri.amap.com/navigation?to=${lng},${lat},${nameEnc}&mode=walk&callnative=0`,
      platform,
      openHours: shop.openHours ?? {},
      source: 'db',
    };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private calcDistanceText(lat1: number, lng1: number, lat2: number, lng2: number): string {
    if (!lat1 || !lng1) return '位置未知';
    const meters = this.haversine(lat1, lng1, lat2, lng2);
    return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
  }

  private isOpenNow(openHours: Record<string, string>, hour: number): boolean {
    if (!openHours || Object.keys(openHours).length === 0) return true;
    const schedule = openHours['weekday'] ?? Object.values(openHours)[0] ?? '';
    const match = schedule.match(/(\d{1,2}):(\d{2})/g);
    if (!match || match.length < 2) return true;
    const open = parseInt(match[0].split(':')[0], 10);
    const closeStr = match[match.length - 1];
    const close = parseInt(closeStr.split(':')[0], 10);
    if (schedule.includes('翌日')) return hour >= open || hour < close;
    return hour >= open && hour < close;
  }
}
