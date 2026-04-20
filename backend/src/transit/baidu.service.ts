import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AmapPOI } from './amap.service';

/**
 * 百度地图 Place API v2 — POI 周边搜索
 * 坐标系：百度 BD-09，通过 ret_coordtype=gcj02ll 转为 GCJ-02（与高德一致）
 * 免费额度：10 万次/天
 */
@Injectable()
export class BaiduService {
  private readonly logger = new Logger(BaiduService.name);
  private readonly ak: string;

  constructor(private readonly config: ConfigService) {
    this.ak = this.config.get<string>('baidu.ak') ?? '';
  }

  get isConfigured(): boolean {
    return !!this.ak;
  }

  /** 周边 POI 搜索（圆形区域），返回与 AmapPOI 相同结构 */
  async searchPOINearby(opts: {
    lat: number;
    lng: number;
    keywords: string;
    radius?: number;
    limit?: number;
  }): Promise<AmapPOI[]> {
    if (!this.ak) return [];
    try {
      const { data } = await axios.get('https://api.map.baidu.com/place/v2/search', {
        params: {
          query: opts.keywords,
          location: `${opts.lat},${opts.lng}`,
          radius: opts.radius ?? 3000,
          output: 'json',
          scope: 2,
          page_size: Math.min(opts.limit ?? 10, 20),
          page_num: 0,
          ret_coordtype: 'gcj02ll',
          ak: this.ak,
        },
        timeout: 5000,
      });
      if (data.status !== 0 || !data.results?.length) return [];
      return (data.results as any[]).map((r) => this.parsePOI(r));
    } catch (err) {
      this.logger.warn(`Baidu POI search error: ${(err as Error).message}`);
      return [];
    }
  }

  /** 关键词 + 城市搜索 */
  async searchPOIByKeyword(opts: {
    keywords: string;
    city: string;
    limit?: number;
  }): Promise<AmapPOI[]> {
    if (!this.ak) return [];
    try {
      const { data } = await axios.get('https://api.map.baidu.com/place/v2/search', {
        params: {
          query: opts.keywords,
          region: opts.city,
          output: 'json',
          scope: 2,
          page_size: Math.min(opts.limit ?? 10, 20),
          page_num: 0,
          ret_coordtype: 'gcj02ll',
          ak: this.ak,
        },
        timeout: 5000,
      });
      if (data.status !== 0 || !data.results?.length) return [];
      return (data.results as any[]).map((r) => this.parsePOI(r));
    } catch (err) {
      this.logger.warn(`Baidu POI keyword error: ${(err as Error).message}`);
      return [];
    }
  }

  private parsePOI(r: any): AmapPOI {
    const loc = r.location ?? {};
    // scope=2 时 detail_info 包含评分、人均、营业时间
    const detail = r.detail_info ?? {};
    const photos: string[] = Array.isArray(r.photos)
      ? r.photos.slice(0, 1).map((p: any) => p.url ?? '')
      : [];
    return {
      id: r.uid ?? '',
      name: r.name ?? '',
      address: r.address ?? '',
      location: `${loc.lng},${loc.lat}`,
      lat: loc.lat ?? 0,
      lng: loc.lng ?? 0,
      tel: r.telephone || undefined,
      rating: detail.overall_rating ? parseFloat(detail.overall_rating) : undefined,
      avgPrice: detail.price ? parseFloat(detail.price) : undefined,
      openTime: detail.opentime_week ?? undefined,
      type: r.detail_info?.tag ?? '',
      photos,
    };
  }
}
