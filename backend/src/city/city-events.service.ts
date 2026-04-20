import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CityEvent } from './city-event.entity';

const SEED_EVENTS = [
  {
    name: '龙华庙会·妙会春灵',
    type: '庙会',
    venue: '龙华广场',
    neighborhood: '龙华会',
    startDate: new Date('2026-04-10T09:00:00'),
    endDate: new Date('2026-04-13T22:00:00'),
    description: '龙华寺年度庙会，汇聚非遗手工艺、传统小吃、民俗演出',
    discounts: { 券: '满100抵30券·限量5万张', 渠道: '龙华会小程序' },
    bookingUrl: 'https://m.dianping.com/search/keyword/1/0_龙华庙会',
    tags: ['传统', '非遗', '亲子', '免费入场'],
    costLow: 0,
    costHigh: 100,
  },
  {
    name: '结缘市集（季节性）',
    type: '市集',
    venue: '龙华会妙街',
    neighborhood: '龙华会',
    startDate: new Date('2026-05-02T10:00:00'),
    endDate: new Date('2026-05-03T21:00:00'),
    description: '龙华会每月第一个周末定期市集，本地品牌与手作摊位',
    discounts: { 特色: '免费入场' },
    bookingUrl: '',
    tags: ['免费', '手作', '本地品牌', '周末'],
    costLow: 0,
    costHigh: 200,
  },
  {
    name: '西岸国际咖啡生活节',
    type: '快闪',
    venue: '徐汇滨江',
    neighborhood: '滨江步道',
    startDate: new Date('2026-04-30T10:00:00'),
    endDate: new Date('2026-05-04T22:00:00'),
    description: '五一期间徐汇滨江咖啡生活节，汇聚上海精品咖啡品牌',
    discounts: { 券: '消费补贴满100抵30', 渠道: '支付宝领券' },
    bookingUrl: 'https://www.westbund.com',
    tags: ['咖啡', '户外', '打卡', '五一'],
    costLow: 30,
    costHigh: 200,
  },
  {
    name: 'SFC露天水岸剧场·周末演出',
    type: '演出',
    venue: '西岸梦中心江边',
    neighborhood: '西岸梦中心',
    startDate: new Date('2026-04-26T19:00:00'),
    endDate: new Date('2026-12-28T22:00:00'),
    description: '常态化周末户外演出，含音乐表演、戏剧、脱口秀',
    discounts: { 促销: '早鸟票9折' },
    bookingUrl: 'https://m.dianping.com/shop/1090158882',
    tags: ['演出', '户外', '周末', '早鸟'],
    costLow: 80,
    costHigh: 300,
  },
  {
    name: 'DiscoTopia舞托邦（已关闭）',
    type: '夜市',
    venue: '西岸梦中心Gate M',
    neighborhood: '西岸梦中心',
    startDate: new Date('2024-08-01T20:00:00'),
    endDate: new Date('2024-11-03T02:00:00'),
    description: '复古轮滑×电音夜生活体验空间，已于2024年11月结束运营',
    discounts: {},
    bookingUrl: '',
    tags: ['已关闭'],
    costLow: 0,
    costHigh: 0,
  },
  {
    name: 'On昂跑社群跑步',
    type: '运动',
    venue: 'On昂跑跑者基地',
    neighborhood: '西岸梦中心',
    startDate: new Date('2026-04-19T07:00:00'),
    endDate: new Date('2026-12-27T09:00:00'),
    description: '每周六早7点社群跑步活动，沿滨江路线，免费参加',
    discounts: { 特色: '免费' },
    bookingUrl: 'https://m.dianping.com/shop/965095094',
    tags: ['免费', '运动', '社群', '周末早晨'],
    costLow: 0,
    costHigh: 0,
  },
  {
    name: 'lululemon瑜伽课',
    type: '运动',
    venue: '西岸梦中心lululemon',
    neighborhood: '西岸梦中心',
    startDate: new Date('2026-04-20T14:00:00'),
    endDate: new Date('2026-12-28T17:00:00'),
    description: '每周末下午免费瑜伽体验课',
    discounts: { 特色: '免费' },
    bookingUrl: 'https://m.dianping.com/search/keyword/1/0_lululemon梦中心',
    tags: ['免费', '瑜伽', '周末', '健康'],
    costLow: 0,
    costHigh: 0,
  },
  {
    name: '朵云轩当期展览',
    type: '展览',
    venue: '朵云轩美术馆',
    neighborhood: '朵云轩',
    startDate: new Date('2026-04-01T10:00:00'),
    endDate: new Date('2026-06-30T17:00:00'),
    description: '当季艺术展览，含版画、书法、当代艺术',
    discounts: { 促销: '部分免费·学生5折' },
    bookingUrl: 'https://m.dianping.com/search/keyword/1/0_朵云轩美术馆',
    tags: ['艺术', '展览', '学生优惠', '部分免费'],
    costLow: 0,
    costHigh: 60,
  },
  {
    name: 'ALDI特惠早市',
    type: '市集',
    venue: '奥乐齐ALDI龙华会',
    neighborhood: '龙华会',
    startDate: new Date('2026-04-17T07:00:00'),
    endDate: new Date('2026-12-31T09:00:00'),
    description: '每天早7-9点ALDI特惠商品，限量供应',
    discounts: { 特惠: '特惠品种限量' },
    bookingUrl: 'https://m.dianping.com/search/keyword/1/0_奥乐齐ALDI龙华会',
    tags: ['早市', '限量', '每日', '超市特惠'],
    costLow: 20,
    costHigh: 100,
  },
];

@Injectable()
export class CityEventsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CityEventsService.name);

  constructor(
    @InjectRepository(CityEvent) private readonly repo: Repository<CityEvent>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.repo.clear();
    await this.repo.save(SEED_EVENTS.map((e) => this.repo.create(e)));
    this.logger.log(`Seeded ${SEED_EVENTS.length} city events`);
  }

  async getActiveEvents(neighborhood?: string): Promise<CityEvent[]> {
    const now = new Date();
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.startDate <= :now', { now })
      .andWhere('e.endDate >= :now', { now });
    if (neighborhood) {
      qb.andWhere('e.neighborhood = :neighborhood', { neighborhood });
    }
    return qb.orderBy('e.startDate', 'ASC').getMany();
  }

  async getEventsContext(): Promise<string> {
    const events = await this.getActiveEvents();
    if (events.length === 0) return '暂无特别活动';
    return events
      .map((e) => {
        const discountText = Object.values(e.discounts)[0] ?? '';
        return `[${e.name}] ${e.neighborhood}·${discountText || '免费入场'}`;
      })
      .join('\n');
  }
}
