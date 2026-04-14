import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /auth/sms/send → 200 (demo mode)', () => {
    return request(app.getHttpServer())
      .post('/auth/sms/send')
      .send({ phone: '13800138000' })
      .expect(200)
      .expect({ message: 'OTP sent' });
  });

  it('POST /auth/sms/verify → accessToken + refreshToken', async () => {
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13800138001' });
    const res = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13800138001', otp: '123456' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /auth/sms/send 手机号格式错误 → 400', () => {
    return request(app.getHttpServer())
      .post('/auth/sms/send')
      .send({ phone: '1234' })
      .expect(400);
  });

  it('POST /auth/sms/verify 错误验证码 → 401', async () => {
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13800138002' });
    return request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13800138002', otp: '000000' })
      .expect(401);
  });

  it('POST /auth/refresh 无效 token → 401', () => {
    return request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401);
  });
});
