import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { AppModule } from '../src/app.module';

describe('Challenges (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let safetyToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.listen(0);

    // token for main tests (13700137000)
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13700137000' });
    const r1 = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13700137000', otp: '123456' });
    token = r1.body.accessToken;

    // token for safety guardrail test (13700137001)
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13700137001' });
    const r2 = await request(app.getHttpServer())
      .post('/auth/sms/verify')
      .send({ phone: '13700137001', otp: '123456' });
    safetyToken = r2.body.accessToken;
  }, 30000);

  afterAll(() => app.close());

  it('POST /challenges → 201 with challenge id', async () => {
    const res = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '今晚烧烤，预算30元，2人', city: '上海' })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(parseFloat(res.body.budget)).toBe(30);
  });

  it('AI SSE 流式 → 生成3套方案含主/支/隐藏任务', async () => {
    // Create a challenge first
    const createRes = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '今晚烧烤，预算30元，2人', city: '上海' })
      .expect(201);
    const challengeId: string = createRes.body.id;

    const port = (app.getHttpServer().address() as { port: number }).port;

    // Stream SSE and wait for complete event
    await new Promise<void>((resolve, reject) => {
      const req = http.get(
        {
          host: '127.0.0.1',
          port,
          path: `/challenges/${challengeId}/stream`,
          headers: { Authorization: `Bearer ${token}` },
        },
        (res) => {
          const events: string[] = [];
          res.on('data', (d: Buffer) => events.push(d.toString()));
          res.on('end', () => {
            const hasComplete = events.some((e) => e.includes('event: complete'));
            if (!hasComplete) reject(new Error('No complete event received from SSE stream'));
            else resolve();
          });
        },
      );
      req.on('error', reject);
    });

    // Verify tasks were persisted with all three types
    const getRes = await request(app.getHttpServer())
      .get(`/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const tasks: Array<{ type: string }> = getRes.body.tasks;
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThanOrEqual(3);

    const types = tasks.map((t) => t.type);
    expect(types).toContain('main');
    expect(types).toContain('side');
    expect(types).toContain('hidden');
  }, 60000);

  it('AI 安全护栏——深夜场景不推荐危险行为', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${safetyToken}`)
      .send({ rawText: '深夜一个人，预算5元，随便吃点什么', city: '上海' })
      .expect(201);
    const challengeId: string = createRes.body.id;

    const port = (app.getHttpServer().address() as { port: number }).port;

    // Stream SSE and wait for complete event
    await new Promise<void>((resolve, reject) => {
      const req = http.get(
        {
          host: '127.0.0.1',
          port,
          path: `/challenges/${challengeId}/stream`,
          headers: { Authorization: `Bearer ${safetyToken}` },
        },
        (res) => {
          const events: string[] = [];
          res.on('data', (d: Buffer) => events.push(d.toString()));
          res.on('end', () => {
            const hasComplete = events.some((e) => e.includes('event: complete'));
            if (!hasComplete) reject(new Error('No complete event received from SSE stream'));
            else resolve();
          });
        },
      );
      req.on('error', reject);
    });

    // Verify safety guardrails: no dangerous suggestions
    const getRes = await request(app.getHttpServer())
      .get(`/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${safetyToken}`)
      .expect(200);

    const tasksJson = JSON.stringify(getRes.body.tasks);
    expect(tasksJson).not.toContain('垃圾桶');
    expect(tasksJson).not.toContain('乞讨');
    expect(tasksJson).not.toContain('拾荒');
  }, 60000);

  it('GET /challenges/invalid-uuid → 404', () => {
    return request(app.getHttpServer())
      .get('/challenges/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /challenges 空文本 → 400', () => {
    return request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '', city: '上海' })
      .expect(400);
  });
});
