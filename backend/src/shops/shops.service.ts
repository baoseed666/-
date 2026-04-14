import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './shop.entity';

@Injectable()
export class ShopsService {
  constructor(@InjectRepository(Shop) private readonly repo: Repository<Shop>) {}

  async search(opts: {
    city: string;
    category?: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<Shop[]> {
    const qb = this.repo.createQueryBuilder('s').where('s.city = :city', { city: opts.city });
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

  findById(id: string) { return this.repo.findOneByOrFail({ id }); }

  /** 供 ChallengeModule 调用：Top15 店铺摘要字符串，注入 AI 上下文 */
  async getContextShops(city: string, category: string, lat?: number, lng?: number): Promise<string> {
    const shops = await this.search({ city, category, lat, lng, limit: 15 });
    if (shops.length === 0) return '（当前城市暂无店铺数据）';
    return shops
      .map((s) => `• ${s.name}（${s.district}，人均¥${s.avgPrice ?? '未知'}，评分${s.rating ?? '?'}，优惠：${JSON.stringify(s.discounts)}）`)
      .join('\n');
  }
}
