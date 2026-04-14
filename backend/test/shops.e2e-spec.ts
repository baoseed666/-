import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Shops (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13900139000' });
    const res = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13900139000', otp: '123456' });
    token = res.body.accessToken;
  });

  afterAll(() => app.close());

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

  it('GET /shops/:id 不存在 ID → 500', () => {
    return request(app.getHttpServer())
      .get('/shops/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([404, 500].includes(res.status)).toBe(true));
  });
});
