import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Challenges (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let challengeId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13700137000' });
    const r = await request(app.getHttpServer()).post('/auth/sms/verify').send({ phone: '13700137000', otp: '123456' });
    token = r.body.accessToken;
  });

  afterAll(() => app.close());

  it('POST /challenges → 201 with challenge id', async () => {
    const res = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '今晚烧烤，预算30元，2人', city: '上海' })
      .expect(201);
    expect(res.body.id).toBeDefined();
    challengeId = res.body.id;
  });

  it('POST /challenges 空文本 → 400', () => {
    return request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '', city: '上海' })
      .expect(400);
  });

  it('GET /challenges/:id → 200 with tasks array', async () => {
    const res = await request(app.getHttpServer())
      .get(`/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.tasks).toBeDefined();
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('GET /challenges/invalid-uuid → 404', () => {
    return request(app.getHttpServer())
      .get('/challenges/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /challenges/:id 无 token → 401', () => {
    return request(app.getHttpServer())
      .get(`/challenges/${challengeId}`)
      .expect(401);
  });
});
