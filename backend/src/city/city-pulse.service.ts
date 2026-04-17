import { Injectable } from '@nestjs/common';
import { CityEventsService } from './city-events.service';
import { CityEvent } from './city-event.entity';

export interface CityPulse {
  weather: {
    temp: number;
    desc: string;
    suitable: boolean;
    icon: string;
  };
  crowdLevel: 'low' | 'medium' | 'high';
  activeEvents: CityEvent[];
  hotNeighborhood: string;
  openShopsCount: number;
  tip: string;
}

@Injectable()
export class CityPulseService {
  constructor(private readonly eventsService: CityEventsService) {}

  async getPulse(): Promise<CityPulse> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const activeEvents = await this.eventsService.getActiveEvents();

    return {
      weather: this.simulateWeather(now),
      crowdLevel: this.computeCrowdLevel(hour, isWeekend, activeEvents.length),
      activeEvents,
      hotNeighborhood: this.computeHotNeighborhood(
        hour,
        isWeekend,
        activeEvents,
      ),
      openShopsCount: this.estimateOpenShops(hour),
      tip: this.buildTip(hour, activeEvents),
    };
  }

  private computeCrowdLevel(
    hour: number,
    isWeekend: boolean,
    activeEventCount: number,
  ): 'low' | 'medium' | 'high' {
    if (isWeekend || activeEventCount > 0) return 'high';
    if (hour >= 18 && hour < 21) return 'medium';
    return 'low';
  }

  private simulateWeather(now: Date): CityPulse['weather'] {
    const month = now.getMonth() + 1;
    if (month >= 4 && month <= 6)
      return { temp: 22, desc: '多云', suitable: true, icon: '🌤️' };
    if (month >= 7 && month <= 9)
      return { temp: 32, desc: '晴热', suitable: false, icon: '☀️' };
    if (month >= 10 || month <= 1)
      return { temp: 10, desc: '晴冷', suitable: true, icon: '🌤️' };
    return { temp: 15, desc: '多云', suitable: true, icon: '🌤️' };
  }

  private computeHotNeighborhood(
    hour: number,
    isWeekend: boolean,
    events: CityEvent[],
  ): string {
    if (events.length > 0) {
      const counts = events.reduce<Record<string, number>>((acc, e) => {
        acc[e.neighborhood] = (acc[e.neighborhood] ?? 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    if (hour >= 7 && hour < 9) return '龙华会';
    if (isWeekend) return '西岸梦中心';
    return '龙华会';
  }

  private estimateOpenShops(hour: number): number {
    if (hour >= 7 && hour < 10) return 15;
    if (hour >= 10 && hour < 22) return 52;
    if (hour >= 22 || hour < 2) return 8;
    return 3;
  }

  private buildTip(hour: number, events: CityEvent[]): string {
    if (hour >= 7 && hour < 9) return 'ALDI早市还有限量特惠，快去抢！';
    const freeEvents = events.filter((e) => e.costLow === 0);
    if (freeEvents.length > 0)
      return `今日有 ${freeEvents.length} 个免费活动，别错过！`;
    if (hour >= 14 && hour < 17) return '下午茶时间，咖啡馆折扣正在进行';
    if (hour >= 18 && hour < 21) return '晚市高峰，建议提前预约或错峰消费';
    return '龙华街道今日营业店铺超过50家，祝省钱愉快！';
  }
}
