import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './shop.entity';

export interface ShopRecommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  address: string | null;
  district: string;
  lat: number;
  lng: number;
  distance: number; // 米
  distanceText: string; // '850m' 或 '1.2km'
  avgPrice: number | null;
  rating: number | null;
  discountTypes: string[];
  discounts: Record<string, string>;
  externalUrl: string | null;
  platform: 'dianping' | 'meituan' | 'unknown';
  openHours: Record<string, string>;
}

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop) private readonly repo: Repository<Shop>,
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

  /** 带距离的智能推荐——用于前端展示 */
  async recommendShops(opts: {
    city: string;
    category?: string;
    lat?: number;
    lng?: number;
    budget?: number; // 人均预算上限
    discountTypes?: string[]; // 筛选优惠类型
    openNow?: boolean;
    nameKeyword?: string; // 店铺名称关键词（如"烧烤"/"火锅"）
    limit?: number;
  }): Promise<ShopRecommendation[]> {
    const shops = await this.search({
      city: opts.city,
      category: opts.category,
      lat: opts.lat,
      lng: opts.lng,
      limit: 50,
    });

    let filtered = shops;

    // 按具体品类关键词精确过滤店铺名称——防止用户要烧烤却推荐咖啡馆
    if (opts.nameKeyword) {
      const kw = opts.nameKeyword;
      const exact = filtered.filter((s) => s.name.includes(kw));
      // 有精确匹配就用精确结果；否则降级不过滤（避免返回空）
      if (exact.length > 0) filtered = exact;
    }

    // 按人均预算过滤
    if (opts.budget && opts.budget > 0) {
      filtered = filtered.filter(
        (s) =>
          s.avgPrice === null ||
          parseFloat(s.avgPrice as unknown as string) <= opts.budget!,
      );
    }

    // 按优惠类型过滤
    if (opts.discountTypes?.length) {
      filtered = filtered.filter((s) =>
        opts.discountTypes!.some((dt) => s.discountTypes?.includes(dt)),
      );
    }

    // 当前是否营业（简单判断）
    if (opts.openNow) {
      const now = new Date();
      const hour = now.getHours();
      filtered = filtered.filter((s) => this.isOpenNow(s.openHours, hour));
    }

    return filtered
      .slice(0, opts.limit ?? 5)
      .map((s) => this.toRecommendation(s, opts.lat, opts.lng));
  }

  /** 供 ChallengeModule 调用：Top15 店铺摘要字符串，注入 AI 上下文 */
  async getContextShops(
    city: string,
    category: string,
    lat?: number,
    lng?: number,
  ): Promise<string> {
    const shops = await this.search({ city, category, lat, lng, limit: 15 });
    if (shops.length === 0) return '（当前城市暂无店铺数据）';
    return shops
      .map((s) => {
        const dist =
          lat && lng
            ? ` 距离${this.calcDistanceText(lat, lng, parseFloat(s.lat as any), parseFloat(s.lng as any))}`
            : '';
        const discountStr = s.discountTypes?.length
          ? s.discountTypes.join('/')
          : '无';
        return `• ${s.name}（${s.district}，人均¥${s.avgPrice ?? '未知'}，评分${s.rating ?? '?'}，优惠类型：${discountStr}，${JSON.stringify(s.discounts)}${dist}）`;
      })
      .join('\n');
  }

  /** 供 ChallengesService 调用：给单个任务匹配真实店铺 */
  async getRecommendationsForTask(
    city: string,
    category: string,
    lat?: number,
    lng?: number,
    budget?: number,
  ): Promise<ShopRecommendation[]> {
    return this.recommendShops({ city, category, lat, lng, budget, limit: 3 });
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

    // Fix fake placeholder URLs — replaced with real dianping search
    const rawUrl = shop.externalUrl;
    const isFakePlaceholder =
      rawUrl &&
      (/\/shop\/sh_lh_\d+$/.test(rawUrl) ||
        /\/meishi\/sh_lh_\d+$/.test(rawUrl));
    const externalUrl = isFakePlaceholder
      ? `https://m.dianping.com/search/keyword/1/0_${encodeURIComponent(shop.name)}`
      : rawUrl;

    let platform: 'dianping' | 'meituan' | 'unknown' = 'unknown';
    if (externalUrl?.includes('dianping.com')) platform = 'dianping';
    else if (externalUrl?.includes('meituan.com')) platform = 'meituan';

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
      avgPrice: shop.avgPrice
        ? parseFloat(shop.avgPrice as unknown as string)
        : null,
      rating: shop.rating ? parseFloat(shop.rating as unknown as string) : null,
      discountTypes: shop.discountTypes ?? [],
      discounts: shop.discounts ?? {},
      externalUrl,
      platform,
      openHours: shop.openHours ?? {},
    };
  }

  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
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

  private calcDistanceText(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): string {
    if (!lat1 || !lng1) return '位置未知';
    const meters = this.haversine(lat1, lng1, lat2, lng2);
    return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
  }

  private isOpenNow(openHours: Record<string, string>, hour: number): boolean {
    if (!openHours || Object.keys(openHours).length === 0) return true;
    const schedule = openHours['weekday'] ?? Object.values(openHours)[0] ?? '';
    // 简单判断: "11:00-22:00" or "17:00-翌日02:00"
    const match = schedule.match(/(\d{1,2}):(\d{2})/g);
    if (!match || match.length < 2) return true;
    const open = parseInt(match[0].split(':')[0], 10);
    const closeStr = match[match.length - 1];
    const close = parseInt(closeStr.split(':')[0], 10);
    if (schedule.includes('翌日')) {
      return hour >= open || hour < close;
    }
    return hour >= open && hour < close;
  }
}
