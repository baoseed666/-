import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WalkingRoute {
  distance: number;
  duration: number;
  summary: string;
  steps: string[];
}

export interface AmapPOI {
  id: string;
  name: string;
  address: string;
  location: string; // "lng,lat"
  lat: number;
  lng: number;
  tel?: string;
  rating?: number;
  avgPrice?: number;
  openTime?: string;
  type?: string;
  photos?: string[];
}

export interface IpLocation {
  lat: number;
  lng: number;
  city: string;
  district: string;
}

@Injectable()
export class AmapService {
  private readonly logger = new Logger(AmapService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('amap.apiKey') ?? '';
  }

  async getWalkingRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<WalkingRoute> {
    if (!this.apiKey) return this.fallbackRoute(origin, destination);
    try {
      const { data } = await axios.get(
        'https://restapi.amap.com/v3/direction/walking',
        {
          params: {
            origin: `${origin.lng},${origin.lat}`,
            destination: `${destination.lng},${destination.lat}`,
            key: this.apiKey,
          },
          timeout: 5000,
        },
      );
      if (data.status !== '1' || !data.route?.paths?.[0]) {
        return this.fallbackRoute(origin, destination);
      }
      const path = data.route.paths[0];
      const distanceM = parseInt(path.distance, 10);
      const durationS = parseInt(path.duration, 10);
      const steps: string[] = (path.steps ?? []).map(
        (s: any) => s.instruction ?? '',
      );
      return {
        distance: distanceM,
        duration: durationS,
        summary: `步行约 ${Math.ceil(durationS / 60)} 分钟（${(distanceM / 1000).toFixed(1)} km）`,
        steps,
      };
    } catch (err) {
      this.logger.warn(`Amap walking route error: ${(err as Error).message}`);
      return this.fallbackRoute(origin, destination);
    }
  }

  /** 高德周边 POI 搜索 — 实时商圈数据 */
  async searchPOINearby(opts: {
    lat: number;
    lng: number;
    keywords: string;
    radius?: number;
    limit?: number;
  }): Promise<AmapPOI[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await axios.get(
        'https://restapi.amap.com/v3/place/around',
        {
          params: {
            location: `${opts.lng},${opts.lat}`,
            keywords: opts.keywords,
            radius: opts.radius ?? 3000,
            sortrule: 'rating',
            offset: opts.limit ?? 10,
            page: 1,
            extensions: 'all',
            key: this.apiKey,
          },
          timeout: 5000,
        },
      );
      if (data.status !== '1' || !data.pois?.length) return [];
      return (data.pois as any[]).map((p) => this.parsePOI(p));
    } catch (err) {
      this.logger.warn(`Amap POI search error: ${(err as Error).message}`);
      return [];
    }
  }

  /** 关键词搜索 POI（不需要坐标）*/
  async searchPOIByKeyword(opts: {
    keywords: string;
    city: string;
    limit?: number;
  }): Promise<AmapPOI[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await axios.get(
        'https://restapi.amap.com/v3/place/text',
        {
          params: {
            keywords: opts.keywords,
            city: opts.city,
            offset: opts.limit ?? 10,
            page: 1,
            extensions: 'all',
            key: this.apiKey,
          },
          timeout: 5000,
        },
      );
      if (data.status !== '1' || !data.pois?.length) return [];
      return (data.pois as any[]).map((p) => this.parsePOI(p));
    } catch (err) {
      this.logger.warn(`Amap POI keyword error: ${(err as Error).message}`);
      return [];
    }
  }

  /** IP 定位降级 */
  async getIpLocation(): Promise<IpLocation | null> {
    if (!this.apiKey) return null;
    try {
      const { data } = await axios.get('https://restapi.amap.com/v3/ip', {
        params: { key: this.apiKey },
        timeout: 3000,
      });
      if (data.status !== '1' || !data.rectangle) return null;
      // rectangle: "lng1,lat1;lng2,lat2"
      const parts = data.rectangle.split(';');
      const [lng1, lat1] = parts[0].split(',').map(Number);
      const [lng2, lat2] = parts[1].split(',').map(Number);
      return {
        lat: (lat1 + lat2) / 2,
        lng: (lng1 + lng2) / 2,
        city: data.city ?? '',
        district: data.district ?? '',
      };
    } catch (err) {
      this.logger.warn(`Amap IP location error: ${(err as Error).message}`);
      return null;
    }
  }

  private parsePOI(p: any): AmapPOI {
    const [lng, lat] = (p.location ?? '0,0').split(',').map(Number);
    const photos: string[] = Array.isArray(p.photos)
      ? p.photos.slice(0, 1).map((ph: any) => ph.url ?? '')
      : [];
    return {
      id: p.id ?? '',
      name: p.name ?? '',
      address: Array.isArray(p.address) ? '' : (p.address ?? ''),
      location: p.location ?? '',
      lat,
      lng,
      tel: Array.isArray(p.tel) ? undefined : (p.tel || undefined),
      rating: p.biz_ext?.rating ? parseFloat(p.biz_ext.rating) : undefined,
      avgPrice: p.biz_ext?.cost ? parseFloat(p.biz_ext.cost) : undefined,
      openTime: p.biz_ext?.open_time ?? undefined,
      type: p.type ?? '',
      photos,
    };
  }

  private fallbackRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): WalkingRoute {
    const R = 6371000;
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distanceM = Math.round(
      R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
    );
    const durationS = Math.round(distanceM / 1.2);
    return {
      distance: distanceM,
      duration: durationS,
      summary: `步行约 ${Math.ceil(durationS / 60)} 分钟（${(distanceM / 1000).toFixed(1)} km）`,
      steps: ['沿龙华街道主路步行前往'],
    };
  }
}
