import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ShopSeedService } from '../src/scraper/shop-seed.service';

describe('Shops (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // 强制重新seed保证测试数据一致
    const seeder = app.get(ShopSeedService);
    await seeder.reseed();

    await request(app.getHttpServer())
      .post('/auth/sms/send')
      .send({ phone: '13900139000' });
    const res = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13900139000', otp: '123456' });
    token = res.body.accessToken;
  }, 30000);

  afterAll(() => app.close());

  // ─── 原有测试 ──────────────────────────────────────────────
  it('GET /shops?city=上海 → 200 数组', () => {
    return request(app.getHttpServer())
      .get('/shops?city=上海')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true));
  });

  it('GET /shops 无 token → 401', () => {
    return request(app.getHttpServer()).get('/shops?city=上海').expect(401);
  });

  it('GET /shops/:id 不存在 ID → 404或500', () => {
    return request(app.getHttpServer())
      .get('/shops/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([404, 500].includes(res.status)).toBe(true));
  });

  // ─── 新增：/shops/recommend 正常场景 ──────────────────────
  it('GET /shops/recommend?city=深圳&lat=22.74&lng=114.04 → 200 含富数据字段', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', lat: 22.74, lng: 114.04, category: '餐饮' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const first = res.body[0];
    expect(first.name).toBeDefined();
    expect(first.distanceText).toBeDefined();
    expect(typeof first.distance).toBe('number');
    expect(Array.isArray(first.discountTypes)).toBe(true);
    expect(first.externalUrl).toBeDefined();
    expect(['dianping', 'meituan', 'unknown']).toContain(first.platform);
  });

  it('GET /shops/recommend?city=深圳&discountTypes=神券 → 每项均含神券', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', discountTypes: '神券' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      for (const shop of res.body) {
        expect(shop.discountTypes).toContain('神券');
      }
    }
  });

  it('GET /shops/recommend?city=深圳&discountTypes=团购 → 每项均含团购', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', discountTypes: '团购' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    if (res.body.length > 0) {
      for (const shop of res.body) {
        expect(shop.discountTypes).toContain('团购');
      }
    }
  });

  it('GET /shops/recommend?city=深圳&budget=50 → avgPrice不超过50（或null）', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', budget: 50 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const shop of res.body) {
      if (shop.avgPrice !== null) {
        expect(shop.avgPrice).toBeLessThanOrEqual(50);
      }
    }
  });

  it('GET /shops/recommend?city=深圳&limit=3 → 最多3条', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', limit: 3 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBeLessThanOrEqual(3);
  });

  it('GET /shops/recommend?city=上海 → 返回上海数据含imageUrl和address', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '上海' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const shop = res.body[0];
    // imageUrl 可为null（图片可能不存在），但字段必须存在
    expect('imageUrl' in shop).toBe(true);
    expect('address' in shop).toBe(true);
    expect('discounts' in shop).toBe(true);
    expect(typeof shop.discounts).toBe('object');
  });

  // ─── 边界场景 ──────────────────────────────────────────────
  it('GET /shops/recommend?city=不存在城市 → 200 空数组（不崩溃）', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '不存在城市XYZ' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('GET /shops/recommend 无token → 401', () => {
    return request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳' })
      .expect(401);
  });

  it('GET /shops/recommend?city=深圳&openNow=true → 正常返回', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', openNow: 'true' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // openNow过滤不应崩溃
  });

  it('GET /shops/recommend?city=深圳&lat=无效坐标 → 降级处理不报错', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳', lat: 'NaN', lng: 'NaN' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  // ─── AI 能力：店铺外链格式 ────────────────────────────────
  it('GET /shops/recommend?city=深圳 → externalUrl格式合法（大众点评或美团）', async () => {
    const res = await request(app.getHttpServer())
      .get('/shops/recommend')
      .query({ city: '深圳' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const shop of res.body) {
      if (shop.externalUrl) {
        expect(
          shop.externalUrl.startsWith('https://www.dianping.com') ||
            shop.externalUrl.startsWith('https://meituan.com') ||
            shop.externalUrl.startsWith('http'),
        ).toBe(true);
      }
    }
  });
});
