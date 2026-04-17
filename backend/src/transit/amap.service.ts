import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WalkingRoute {
  distance: number;
  duration: number;
  summary: string;
  steps: string[];
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
      this.logger.warn(`Amap API error: ${(err as Error).message}`);
      return this.fallbackRoute(origin, destination);
    }
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
