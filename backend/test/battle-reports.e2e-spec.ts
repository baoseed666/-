import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BattleReports (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let challengeId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // register / login
    await request(app.getHttpServer())
      .post('/auth/sms/send')
      .send({ phone: '13600136000' });
    const authRes = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13600136000', otp: '123456' });
    token = authRes.body.accessToken;

    // create and complete a challenge so generate has data to work with
    const createRes = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '今晚烧烤，预算50元，2人', city: '深圳' })
      .expect(201);
    challengeId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/challenges/${challengeId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ savedAmount: 15 })
      .expect(200);
  }, 30000);

  afterAll(() => app.close());

  it('POST /reports → 201 with rankTitle, percentile, imageUrl matching /uploads/reports/*.png', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ challengeId })
      .expect(201);

    expect(res.body.rankTitle).toBeDefined();
    expect(typeof res.body.percentile).toBe('number');
    expect(res.body.imageUrl).toMatch(/\/uploads\/reports\/.+\.png/);
  }, 60000);

  it('GET /reports/unknown-uuid → 404', () => {
    return request(app.getHttpServer())
      .get('/reports/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /reports 无 token → 401', () => {
    return request(app.getHttpServer())
      .post('/reports')
      .send({ challengeId })
      .expect(401);
  });
});
