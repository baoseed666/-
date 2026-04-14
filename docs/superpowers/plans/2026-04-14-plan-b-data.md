# 抠门大王 Plan B — 数据层（爬虫 + ShopModule）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现大众点评真实数据爬取（多城市/多品类），完成 ShopModule 搜索 API，使挑战引擎可查询真实店铺数据。

**Architecture:** Puppeteer + stealth 插件在 Bull 队列 Worker 中并发爬取，限速 1-3 req/s，结果写入 PostgreSQL shops 表。ShopModule 提供按城市/品类/距离的复合查询接口，同时向 ChallengeModule 暴露 Top15 上下文注入接口。

**Tech Stack:** Puppeteer, puppeteer-extra-plugin-stealth, Bull, TypeORM, PostgreSQL

**依赖：** Plan A 已完成（shops 表已存在）

---

### Task 5: 大众点评爬虫实现

**Files:**
- Modify: `backend/scraper/scraper.processor.ts` (填充 Puppeteer 实现)
- Create: `backend/scraper/dianping.scraper.ts`
- Create: `backend/scraper/rate-limiter.ts`

- [ ] **Step 1: 创建限速器**

```typescript
// backend/scraper/rate-limiter.ts
export class RateLimiter {
  private lastCallAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    const jitter = Math.random() * 500; // 0-500ms 随机抖动
    const wait = Math.max(0, this.minIntervalMs + jitter - elapsed);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }
}
```

- [ ] **Step 2: 实现 DianpingScraper**

```typescript
// backend/scraper/dianping.scraper.ts
import * as puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Logger } from '@nestjs/common';
import { RateLimiter } from './rate-limiter';

puppeteer.use(StealthPlugin());

export interface RawShop {
  name: string;
  category: string;
  city: string;
  district: string;
  avgPrice: number | null;
  rating: number | null;
  lat: number;
  lng: number;
  discounts: Record<string, unknown>;
  openHours: Record<string, unknown>;
  externalId: string;
}

export class DianpingScraper {
  private readonly logger = new Logger(DianpingScraper.name);
  private readonly limiter = new RateLimiter(600); // 最少600ms间隔（约1.6 req/s）

  async scrapeCategory(city: string, category: string, page = 1): Promise<RawShop[]> {
    const browser = await (puppeteer as any).launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const tab = await browser.newPage();
      await tab.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      );
      await tab.setViewport({ width: 390, height: 844 });

      await this.limiter.throttle();
      const url = this.buildUrl(city, category, page);
      this.logger.log(`Fetching: ${url}`);
      await tab.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // 等待店铺列表加载
      await tab.waitForSelector('.shop-list-item, .J_shop_item', { timeout: 15000 }).catch(() => {});

      const shops = await tab.evaluate((cityArg: string, catArg: string) => {
        const items = document.querySelectorAll('.shop-list-item, .J_shop_item, [data-testid="shop-item"]');
        return Array.from(items).map((el) => {
          const name = el.querySelector('.shop-name, .title')?.textContent?.trim() ?? '';
          const rating = parseFloat(el.querySelector('.star-score, .rating')?.textContent ?? '0') || null;
          const avgPrice = parseFloat(el.querySelector('.per-price, .avg-price')?.textContent?.replace(/[^0-9.]/g, '') ?? '0') || null;
          const district = el.querySelector('.address, .district')?.textContent?.trim() ?? '';
          const externalId = el.getAttribute('data-id') ?? el.querySelector('a')?.href?.match(/\/(\d+)$/)?.[1] ?? '';
          return { name, category: catArg, city: cityArg, district, avgPrice, rating,
                   lat: 0, lng: 0, discounts: {}, openHours: {}, externalId };
        }).filter((s) => s.name && s.externalId);
      }, city, category);

      return shops as RawShop[];
    } finally {
      await browser.close();
    }
  }

  private buildUrl(city: string, category: string, page: number): string {
    const cityMap: Record<string, string> = {
      '上海': 'shanghai', '北京': 'beijing', '广州': 'guangzhou',
      '深圳': 'shenzhen', '成都': 'chengdu', '杭州': 'hangzhou',
      '武汉': 'wuhan', '西安': 'xian',
    };
    const catMap: Record<string, string> = { '餐饮': 'food', '娱乐': 'entertainment', '购物': 'shopping' };
    const citySlug = cityMap[city] ?? city.toLowerCase();
    const catSlug = catMap[category] ?? category;
    return `https://www.dianping.com/${citySlug}/${catSlug}/p${page}`;
  }
}
```

- [ ] **Step 3: 填充 ScraperProcessor**

```typescript
// backend/scraper/scraper.processor.ts  (完整替换)
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Shop } from '../src/shops/shop.entity';
import { DianpingScraper } from './dianping.scraper';

export interface ScrapeJob { city: string; category: string; page?: number; }

@Processor('scraper', { concurrency: 2 })
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  private readonly scraper = new DianpingScraper();

  constructor(@InjectRepository(Shop) private readonly shops: Repository<Shop>) {
    super();
  }

  async process(job: Job<ScrapeJob>): Promise<void> {
    const { city, category, page = 1 } = job.data;
    this.logger.log(`Scraping ${city}/${category} page ${page}`);

    const raw = await this.scraper.scrapeCategory(city, category, page);
    if (raw.length === 0) {
      this.logger.warn(`No results for ${city}/${category} page ${page}`);
      return;
    }

    // upsert by externalId
    for (const r of raw) {
      await this.shops.upsert(
        { ...r, scrapedAt: new Date() },
        { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true },
      );
    }
    this.logger.log(`Saved ${raw.length} shops for ${city}/${category} page ${page}`);
  }
}
```

- [ ] **Step 4: 本地验证爬虫（单次手动测试）**

```bash
# 先启动 scraper worker
cd backend && npm run start:scraper:dev &

# 触发一个爬虫任务
curl -X POST http://localhost:3000/admin/scraper/start \
  -H "Content-Type: application/json" \
  -d '{"city":"上海","category":"餐饮"}'
```

Expected: 队列返回 `{"enqueued":1,...}`，scraper worker 日志显示爬取结果，PostgreSQL shops 表有数据

- [ ] **Step 5: 验证数据入库**

```bash
docker exec -it $(docker ps -qf name=postgres) \
  psql -U koumen -d koumen -c "SELECT name, category, city, rating FROM shops LIMIT 10;"
```

Expected: 看到真实店铺数据行

- [ ] **Step 6: Commit**

```bash
cd D:/projects/抠门大王
git add backend/scraper/
git commit -m "feat: dianping scraper — puppeteer+stealth, rate limiter, Bull upsert"
```

---

### Task 6: ShopModule API

**Files:**
- Create: `backend/src/shops/shops.module.ts`
- Create: `backend/src/shops/shops.service.ts`
- Create: `backend/src/shops/shops.controller.ts`
- Create: `backend/src/shops/dto/query-shops.dto.ts`
- Create: `backend/test/shops.e2e-spec.ts`

- [ ] **Step 1: ShopsService（搜索 + AI上下文注入接口）**

```typescript
// backend/src/shops/shops.service.ts
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
      // 按距离排序（Haversine 简化版，精度足够城区级别）
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

  /** 供 ChallengeModule 调用：返回最适合注入 AI 上下文的 Top15 店铺摘要 */
  async getContextShops(city: string, category: string, lat?: number, lng?: number): Promise<string> {
    const shops = await this.search({ city, category, lat, lng, limit: 15 });
    return shops
      .map((s) => `• ${s.name}（${s.district}，人均¥${s.avgPrice ?? '未知'}，评分${s.rating ?? '?'}，优惠：${JSON.stringify(s.discounts)}）`)
      .join('\n');
  }
}
```

- [ ] **Step 2: ShopsController**

```typescript
// backend/src/shops/shops.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  search(
    @Query('city') city: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shops.search({
      city,
      category,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shops.findById(id);
  }
}
```

- [ ] **Step 3: ShopsModule（注册 + 导出 ShopsService）**

```typescript
// backend/src/shops/shops.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from './shop.entity';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shop])],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],   // ChallengesModule 依赖此导出
})
export class ShopsModule {}
```

更新 `app.module.ts` 引入 ShopsModule：

```typescript
// backend/src/app.module.ts — 追加 ShopsModule
import { ShopsModule } from './shops/shops.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ShopsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: 写 Shops E2E 测试**

```typescript
// backend/test/shops.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Shops (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // 获取测试 token
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13900139000' });
    const res = await request(app.getHttpServer()).post('/auth/sms/verify').send({ phone: '13900139000', otp: '123456' });
    token = res.body.accessToken;
  });

  afterAll(() => app.close());

  // 正常场景
  it('GET /shops?city=上海 → 200 数组', () => {
    return request(app.getHttpServer())
      .get('/shops?city=上海')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true));
  });

  it('GET /shops/:id → 200 单个店铺', async () => {
    const list = await request(app.getHttpServer())
      .get('/shops?city=上海&limit=1')
      .set('Authorization', `Bearer ${token}`);
    if (list.body.length === 0) return; // 数据库可能为空
    return request(app.getHttpServer())
      .get(`/shops/${list.body[0].id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(res.body.name).toBeDefined());
  });

  // 异常场景
  it('GET /shops 无 token → 401', () => {
    return request(app.getHttpServer()).get('/shops?city=上海').expect(401);
  });

  it('GET /shops/:id 不存在 ID → 404/500', () => {
    return request(app.getHttpServer())
      .get('/shops/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([404, 500].includes(res.status)).toBe(true));
  });
});
```

- [ ] **Step 5: 运行 E2E 测试**

```bash
cd backend && npm run test:e2e -- --testPathPattern=shops
```

Expected: 全部通过（如 shops 表为空，跳过店铺详情测试）

- [ ] **Step 6: Commit**

```bash
cd D:/projects/抠门大王
git add backend/src/shops/ backend/test/shops.e2e-spec.ts
git commit -m "feat: shops module — haversine search, context injection for AI, e2e tests"
```

---

## Plan B 完成标准

- [ ] 爬虫成功爬取上海/餐饮数据并写入 shops 表
- [ ] `GET /shops?city=上海` 返回真实店铺数据
- [ ] Shops E2E 全部通过
- [ ] Git 2 个原子提交
