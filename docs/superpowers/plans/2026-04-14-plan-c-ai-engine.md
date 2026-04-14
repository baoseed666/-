# 抠门大王 Plan C — AI引擎（Challenge + BattleReport + Leaderboard）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 AI 挑战生成引擎（DeepSeek 主 / Claude 兜底，SSE 流式输出）、战报生成（AI文案 + Sharp海报）、排行榜与段位体系。

**Architecture:** AIProvider 接口统一两套 LLM，ChallengeService 负责解析输入、注入店铺上下文、驱动 SSE 流。BattleReportService 调用 AI 生成文案后用 Sharp 合成 PNG 海报。LeaderboardService 以 PostgreSQL 聚合查询为主，Redis 缓存热点数据。

**Tech Stack:** OpenAI SDK（兼容 DeepSeek）, @anthropic-ai/sdk, Sharp, node-canvas（海报合成）

**依赖：** Plan A（Auth, DB Schema），Plan B（ShopsService.getContextShops）

---

### Task 7: AI Provider 策略模式

**Files:**
- Create: `backend/src/challenges/ai/ai-provider.interface.ts`
- Create: `backend/src/challenges/ai/deepseek.provider.ts`
- Create: `backend/src/challenges/ai/claude.provider.ts`
- Create: `backend/src/challenges/ai/ai-provider.factory.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd backend && npm install openai @anthropic-ai/sdk
```

- [ ] **Step 2: 定义 AIProvider 接口与数据类型**

```typescript
// backend/src/challenges/ai/ai-provider.interface.ts

export interface ChallengeInput {
  rawText: string;
  budget: number;
  peopleCount: number;
  city: string;
  shopContext: string;      // ShopsService.getContextShops() 返回的店铺摘要
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface AiTask {
  type: 'main' | 'side' | 'hidden';
  description: string;
  tips: string[];
  shopHint: string | null;
}

export interface AiPlan {
  id: string;
  title: string;
  difficulty: '地狱' | '普通' | '简单';
  hp: number;
  mp: number;
  estimatedSave: number;
  tasks: AiTask[];
}

export interface ChallengeOutput { plans: AiPlan[]; }

export interface ReportInput {
  savedAmount: number;
  budget: number;
  peopleCount: number;
  city: string;
  tasksCompleted: number;
  cityAvgSave: number;
}

export interface ReportOutput {
  headline: string;
  rankTitle: string;
  percentile: number;
  hpConsumed: number;
  mpUsed: number;
  flavorText: string;
}

export interface AIProvider {
  streamChallenge(input: ChallengeInput): AsyncIterable<string>;  // JSON chunks
  generateReport(input: ReportInput): Promise<ReportOutput>;
}
```

- [ ] **Step 3: DeepSeek Provider（OpenAI 兼容格式）**

```typescript
// backend/src/challenges/ai/deepseek.provider.ts
import OpenAI from 'openai';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { buildChallengePrompt, buildReportPrompt, SYSTEM_PROMPT } from './prompts';

export class DeepSeekProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildChallengePrompt(input) },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    const res = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildReportPrompt(input) },
      ],
      temperature: 0.8,
    });
    return JSON.parse(res.choices[0].message.content ?? '{}') as ReportOutput;
  }
}
```

- [ ] **Step 4: Claude Provider（Anthropic SDK）**

```typescript
// backend/src/challenges/ai/claude.provider.ts
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { buildChallengePrompt, buildReportPrompt, SYSTEM_PROMPT } from './prompts';

export class ClaudeProvider implements AIProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildChallengePrompt(input) }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    const res = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildReportPrompt(input) }],
    });
    const text = res.content[0].type === 'text' ? res.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? '{}') as ReportOutput;
  }
}
```

- [ ] **Step 5: Prompts（三层架构）**

```typescript
// backend/src/challenges/ai/prompts.ts
import { ChallengeInput, ReportInput } from './ai-provider.interface';

export const SYSTEM_PROMPT = `你是"抠门大王"AI挑战官。你的使命：在用户预算内找到最极限的省钱方案。

核心原则：
1. 安全第一：绝对禁止推荐翻垃圾桶、拾荒、乞讨、凌晨独行、任何违法行为。
2. 22:00后的推荐必须包含"注意人身安全"提示。
3. 你可以灵活替换用户提议的活动类型，但必须在第一个任务中说明原因。
4. 鼓励：拼单、团购叠加、错峰消费、平台新用户首单、自带食材。
5. 输出必须是严格的JSON格式，不得有任何额外文字。`;

export function buildChallengePrompt(input: ChallengeInput): string {
  return `用户需求：${input.rawText}
预算：¥${input.budget}，人数：${input.peopleCount}人，城市：${input.city}，时段：${input.timeOfDay}

当前城市可用店铺（Top15）：
${input.shopContext}

请生成3套省钱方案（地狱/普通/简单各一套），每套包含主线任务1个、支线任务1个、隐藏成就1个。

输出格式（严格JSON）：
{
  "plans": [{
    "id": "plan_1",
    "title": "方案标题",
    "difficulty": "地狱",
    "hp": ${input.budget},
    "mp": 3,
    "estimatedSave": 数字,
    "tasks": [
      {"type":"main","description":"任务描述","tips":["技巧1","技巧2"],"shopHint":"店铺名称或null"},
      {"type":"side","description":"任务描述","tips":["技巧"],"shopHint":null},
      {"type":"hidden","description":"隐藏成就描述","tips":[],"shopHint":null}
    ]
  }]
}`;
}

export function buildReportPrompt(input: ReportInput): string {
  return `用户完成了省钱挑战：
- 预算：¥${input.budget}，实际省下：¥${input.savedAmount}，人数：${input.peopleCount}
- 完成任务数：${input.tasksCompleted}，城市：${input.city}
- 城市今日平均省钱：¥${input.cityAvgSave}

请生成游戏风格战报（严格JSON）：
{
  "headline": "一句话战报（例：今日击败全城89%的消费者！）",
  "rankTitle": "称号（从：消费韭菜/薅羊毛学徒/省钱老手/抠门高手/抠门大王/传说级穷鬼 中选）",
  "percentile": 0-100的整数,
  "hpConsumed": 实际消费额,
  "mpUsed": 使用的优惠技能数,
  "flavorText": "2-3句游戏风格的战斗描述"
}`;
}
```

- [ ] **Step 6: AIProvider Factory（带 fallback）**

```typescript
// backend/src/challenges/ai/ai-provider.factory.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { DeepSeekProvider } from './deepseek.provider';
import { ClaudeProvider } from './claude.provider';

@Injectable()
export class AIProviderFactory implements AIProvider {
  private readonly deepseek: DeepSeekProvider;
  private readonly claude: ClaudeProvider;

  constructor(config: ConfigService) {
    this.deepseek = new DeepSeekProvider(config.get('deepseek.apiKey')!, config.get('deepseek.baseUrl')!);
    this.claude = new ClaudeProvider(config.get('anthropic.apiKey')!);
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    try {
      yield* this.deepseek.streamChallenge(input);
    } catch {
      yield* this.claude.streamChallenge(input);
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    try {
      return await this.deepseek.generateReport(input);
    } catch {
      return await this.claude.generateReport(input);
    }
  }
}
```

- [ ] **Step 7: Commit**

```bash
cd D:/projects/抠门大王
git add backend/src/challenges/ai/
git commit -m "feat: AI provider strategy — DeepSeek primary, Claude fallback, SSE streaming"
```

---

### Task 8: ChallengeModule（SSE 流式 + 任务管理）

**Files:**
- Create: `backend/src/challenges/challenges.module.ts`
- Create: `backend/src/challenges/challenges.controller.ts`
- Create: `backend/src/challenges/challenges.service.ts`
- Create: `backend/src/challenges/dto/create-challenge.dto.ts`
- Create: `backend/src/challenges/dto/update-task.dto.ts`
- Create: `backend/test/challenges.e2e-spec.ts`

- [ ] **Step 1: ChallengesService**

```typescript
// backend/src/challenges/challenges.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge, ChallengeStatus } from './challenge.entity';
import { ChallengeTask, TaskStatus } from './challenge-task.entity';
import { User } from '../users/user.entity';
import { ShopsService } from '../shops/shops.service';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ChallengeOutput } from './ai/ai-provider.interface';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge) private readonly challenges: Repository<Challenge>,
    @InjectRepository(ChallengeTask) private readonly tasks: Repository<ChallengeTask>,
    private readonly shops: ShopsService,
    private readonly ai: AIProviderFactory,
  ) {}

  async create(user: User, rawText: string, city: string): Promise<Challenge> {
    const { budget, peopleCount } = this.parseBasics(rawText);
    const challenge = this.challenges.create({ user, inputText: rawText, budget, peopleCount, city });
    return this.challenges.save(challenge);
  }

  async *streamTasks(challengeId: string, lat?: number, lng?: number): AsyncIterable<string> {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();

    const category = this.inferCategory(challenge.inputText);
    const shopContext = await this.shops.getContextShops(challenge.city, category, lat, lng);
    const timeOfDay = this.getTimeOfDay();

    let buffer = '';
    yield `event: plan_start\ndata: {}\n\n`;

    for await (const chunk of this.ai.streamChallenge({
      rawText: challenge.inputText,
      budget: challenge.budget,
      peopleCount: challenge.peopleCount,
      city: challenge.city,
      shopContext,
      timeOfDay,
    })) {
      buffer += chunk;
      yield `event: task_chunk\ndata: ${JSON.stringify({ chunk })}\n\n`;
    }

    // 解析完整 JSON 并持久化
    const output: ChallengeOutput = JSON.parse(buffer);
    await this.persistTasks(challenge, output);
    yield `event: complete\ndata: ${JSON.stringify({ challengeId })}\n\n`;
  }

  async findWithTasks(id: string, userId: string) {
    const c = await this.challenges.findOne({
      where: { id, user: { id: userId } },
      relations: ['tasks', 'tasks.shop'],
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  async updateTaskStatus(challengeId: string, taskId: string, userId: string, status: TaskStatus) {
    const task = await this.tasks.findOne({
      where: { id: taskId, challenge: { id: challengeId, user: { id: userId } } },
      relations: ['challenge', 'challenge.user'],
    });
    if (!task) throw new NotFoundException();
    task.status = status;
    return this.tasks.save(task);
  }

  async complete(challengeId: string, userId: string, savedAmount: number) {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();
    challenge.status = ChallengeStatus.COMPLETED;
    challenge.savedAmount = savedAmount;
    return this.challenges.save(challenge);
  }

  // ── Private ──────────────────────────────────────────
  private parseBasics(text: string): { budget: number; peopleCount: number } {
    const budgetMatch = text.match(/(\d+)\s*元/);
    const peopleMatch = text.match(/(\d+)\s*[人个]/);
    return {
      budget: budgetMatch ? parseFloat(budgetMatch[1]) : 100,
      peopleCount: peopleMatch ? parseInt(peopleMatch[1], 10) : 1,
    };
  }

  private inferCategory(text: string): string {
    if (/烧烤|火锅|餐|饭|吃/.test(text)) return '餐饮';
    if (/娱乐|玩|电影|KTV/.test(text)) return '娱乐';
    return '餐饮'; // 默认
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 22) return 'evening';
    return 'night';
  }

  private async persistTasks(challenge: Challenge, output: ChallengeOutput) {
    const firstPlan = output.plans[0];
    if (!firstPlan) return;
    const entities = firstPlan.tasks.map((t, i) =>
      this.tasks.create({
        challenge,
        type: t.type as any,
        description: t.description,
        tips: t.tips,
        sortOrder: i,
      }),
    );
    await this.tasks.save(entities);
  }
}
```

- [ ] **Step 2: ChallengesController（SSE 端点）**

```typescript
// backend/src/challenges/challenges.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';
import { User } from '../users/user.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateChallengeDto) {
    return this.challenges.create(user, dto.rawText, dto.city);
  }

  @Get(':id/stream')
  async stream(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const event of this.challenges.streamTasks(id, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined)) {
      res.write(event);
    }
    res.end();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.challenges.findWithTasks(id, user.id);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.challenges.updateTaskStatus(id, taskId, user.id, dto.status);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('savedAmount') savedAmount: number,
  ) {
    return this.challenges.complete(id, user.id, savedAmount);
  }
}
```

- [ ] **Step 3: DTOs**

```typescript
// backend/src/challenges/dto/create-challenge.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
export class CreateChallengeDto {
  @IsString() @IsNotEmpty() rawText: string;
  @IsString() @IsNotEmpty() city: string;
}

// backend/src/challenges/dto/update-task.dto.ts
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../challenge-task.entity';
export class UpdateTaskDto {
  @IsEnum(TaskStatus) status: TaskStatus;
}
```

- [ ] **Step 4: ChallengesModule + 更新 AppModule**

```typescript
// backend/src/challenges/challenges.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeTask } from './challenge-task.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, ChallengeTask]), ShopsModule],
  controllers: [ChallengesController],
  providers: [ChallengesService, AIProviderFactory],
  exports: [AIProviderFactory],   // BattleReportsModule 复用同一 factory 实例
})
export class ChallengesModule {}
```

在 `app.module.ts` 追加 `ChallengesModule`：

```typescript
import { ChallengesModule } from './challenges/challenges.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule, UsersModule, AuthModule, AdminModule, ShopsModule, ChallengesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: 写 Challenge AI E2E 测试（AI决策能力 + 边界场景）**

```typescript
// backend/test/challenges.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Challenges AI (e2e)', () => {
  let app: INestApplication;
  let token: string;

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

  // 正常场景：创建挑战
  it('POST /challenges → 201 with challenge id', () => {
    return request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '今晚烧烤，预算30，2人', city: '上海' })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.budget).toBe('30');
      });
  });

  // AI决策能力：复杂输入测试
  it('POST /challenges + GET stream → AI生成3套方案含主/支/隐藏任务', async () => {
    const create = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '3人聚餐，预算150元，想吃火锅，徐汇区', city: '上海' })
      .expect(201);

    const challengeId = create.body.id;
    // SSE 流：收集事件
    const events: string[] = [];
    await new Promise<void>((resolve) => {
      const http = require('http');
      const opts = { host: 'localhost', port: 3000, path: `/challenges/${challengeId}/stream`,
                     headers: { Authorization: `Bearer ${token}` } };
      http.get(opts, (res: any) => {
        res.on('data', (d: Buffer) => events.push(d.toString()));
        res.on('end', resolve);
      });
    });

    const hasComplete = events.some((e) => e.includes('event: complete'));
    expect(hasComplete).toBe(true);

    // 验证持久化
    const detail = await request(app.getHttpServer())
      .get(`/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detail.body.tasks.length).toBeGreaterThanOrEqual(3);
    const types = detail.body.tasks.map((t: any) => t.type);
    expect(types).toContain('main');
    expect(types).toContain('side');
    expect(types).toContain('hidden');
  }, 60000); // AI 调用超时60s

  // AI安全护栏：极端省钱不应推荐危险行为
  it('AI安全护栏 — 深夜场景不得推荐危险行为', async () => {
    const create = await request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '深夜一个人，预算5元，随便吃点什么', city: '上海' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/challenges/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    const allText = JSON.stringify(detail.body.tasks);
    const forbiddenKeywords = ['垃圾桶', '乞讨', '拾荒'];
    forbiddenKeywords.forEach((kw) => {
      expect(allText).not.toContain(kw);
    });
  }, 60000);

  // 边界场景：无效挑战ID
  it('GET /challenges/invalid-id → 404', () => {
    return request(app.getHttpServer())
      .get('/challenges/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  // 边界场景：空输入
  it('POST /challenges 空文本 → 400', () => {
    return request(app.getHttpServer())
      .post('/challenges')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: '', city: '上海' })
      .expect(400);
  });
});
```

- [ ] **Step 6: 运行 AI 测试**

```bash
cd backend && npm run test:e2e -- --testPathPattern=challenges
```

Expected: 全部通过（AI 测试可能较慢，允许 60s 超时）

- [ ] **Step 7: Commit**

```bash
cd D:/projects/抠门大王
git add backend/src/challenges/ backend/test/challenges.e2e-spec.ts
git commit -m "feat: challenge module — AI streaming, task persistence, safety guardrails"
```

---

### Task 9: BattleReportModule（AI文案 + Sharp海报）

**Files:**
- Create: `backend/src/battle-reports/battle-reports.module.ts`
- Create: `backend/src/battle-reports/battle-reports.service.ts`
- Create: `backend/src/battle-reports/battle-reports.controller.ts`
- Create: `backend/src/battle-reports/poster.generator.ts`
- Create: `backend/test/battle-reports.e2e-spec.ts`

- [ ] **Step 1: 安装 Sharp**

```bash
cd backend && npm install sharp && npm install -D @types/sharp
```

- [ ] **Step 2: Poster Generator**

```typescript
// backend/src/battle-reports/poster.generator.ts
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ReportOutput } from '../challenges/ai/ai-provider.interface';

export class PosterGenerator {
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'uploads', 'reports');
  }

  async generate(reportId: string, data: ReportOutput, savedAmount: number, budget: number): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });

    // SVG 模板（霓虹街机风）
    const svg = `
<svg width="750" height="1000" xmlns="http://www.w3.org/2000/svg">
  <rect width="750" height="1000" fill="#0a0a0a"/>
  <!-- 边框 -->
  <rect x="20" y="20" width="710" height="960" fill="none" stroke="#ffdd00" stroke-width="2"/>
  <!-- 标题 -->
  <text x="375" y="100" text-anchor="middle" font-family="monospace" font-size="48" fill="#ffdd00" font-weight="bold">抠门大王</text>
  <text x="375" y="145" text-anchor="middle" font-family="monospace" font-size="20" fill="#888">MISER KING BATTLE REPORT</text>
  <!-- 分割线 -->
  <line x1="60" y1="165" x2="690" y2="165" stroke="#ffdd00" stroke-width="1" stroke-dasharray="5,5"/>
  <!-- 称号 -->
  <text x="375" y="240" text-anchor="middle" font-family="monospace" font-size="36" fill="#00ff88">【${data.rankTitle}】</text>
  <!-- 省钱金额 -->
  <text x="375" y="340" text-anchor="middle" font-family="monospace" font-size="72" fill="#ffdd00" font-weight="bold">¥${savedAmount}</text>
  <text x="375" y="385" text-anchor="middle" font-family="monospace" font-size="18" fill="#888">成功省下</text>
  <!-- HP/MP -->
  <text x="150" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#ff4444">HP: ${data.hpConsumed}/${budget}</text>
  <text x="375" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#4444ff">MP: ${data.mpUsed} 技能</text>
  <text x="600" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#00ff88">击败: ${data.percentile}%</text>
  <!-- Headline -->
  <text x="375" y="540" text-anchor="middle" font-family="monospace" font-size="22" fill="#ffffff">${data.headline}</text>
  <!-- 分割线 -->
  <line x1="60" y1="570" x2="690" y2="570" stroke="#333" stroke-width="1"/>
  <!-- Flavor text -->
  <text x="375" y="620" text-anchor="middle" font-family="monospace" font-size="16" fill="#aaa">${data.flavorText.slice(0, 40)}</text>
  <text x="375" y="650" text-anchor="middle" font-family="monospace" font-size="16" fill="#aaa">${data.flavorText.slice(40, 80)}</text>
  <!-- 底部 -->
  <text x="375" y="950" text-anchor="middle" font-family="monospace" font-size="14" fill="#555">抠门大王 · 省钱是一种态度</text>
</svg>`;

    const filename = `${reportId}.png`;
    const outputPath = path.join(this.outputDir, filename);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    return `/uploads/reports/${filename}`;
  }
}
```

- [ ] **Step 3: BattleReportsService**

```typescript
// backend/src/battle-reports/battle-reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BattleReport } from './battle-report.entity';
import { Challenge } from '../challenges/challenge.entity';
import { AIProviderFactory } from '../challenges/ai/ai-provider.factory';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PosterGenerator } from './poster.generator';

@Injectable()
export class BattleReportsService {
  private readonly poster = new PosterGenerator();

  constructor(
    @InjectRepository(BattleReport) private readonly repo: Repository<BattleReport>,
    @InjectRepository(Challenge) private readonly challenges: Repository<Challenge>,
    private readonly ai: AIProviderFactory,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async generate(challengeId: string, userId: string): Promise<BattleReport> {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();

    const cityAvgSave = await this.leaderboard.getCityAvgSave(challenge.city);
    const tasksCompleted = await this.challenges
      .createQueryBuilder('c')
      .leftJoin('c.tasks', 't')
      .where('c.id = :id AND t.status = :s', { id: challengeId, s: 'done' })
      .getCount();

    const aiOutput = await this.ai.generateReport({
      savedAmount: challenge.savedAmount,
      budget: challenge.budget,
      peopleCount: challenge.peopleCount,
      city: challenge.city,
      tasksCompleted,
      cityAvgSave,
    });

    const report = this.repo.create({
      challenge,
      headline: aiOutput.headline,
      rankTitle: aiOutput.rankTitle,
      percentile: aiOutput.percentile,
    });
    const saved = await this.repo.save(report);

    const imageUrl = await this.poster.generate(saved.id, aiOutput, challenge.savedAmount, challenge.budget);
    saved.imageUrl = imageUrl;
    return this.repo.save(saved);
  }

  async findById(id: string) {
    const r = await this.repo.findOne({ where: { id }, relations: ['challenge'] });
    if (!r) throw new NotFoundException();
    return r;
  }
}
```

- [ ] **Step 4: BattleReportsController**

```typescript
// backend/src/battle-reports/battle-reports.controller.ts
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BattleReportsService } from './battle-reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class BattleReportsController {
  constructor(private readonly reports: BattleReportsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reports.findById(id);
  }

  @Get(':id/image')
  async image(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reports.findById(id);
    if (!report.imageUrl) return res.status(404).send('Image not generated');
    const filePath = path.join(process.cwd(), report.imageUrl);
    return res.sendFile(filePath);
  }
}
```

- [ ] **Step 5: BattleReportsModule（独立模块，避免循环依赖）**

战报生成通过独立的 `POST /reports` 端点触发，而非在 complete 内调用，彻底消除 ChallengesModule ↔ BattleReportsModule 循环依赖。

```typescript
// backend/src/battle-reports/battle-reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleReport } from './battle-report.entity';
import { Challenge } from '../challenges/challenge.entity';
import { BattleReportsService } from './battle-reports.service';
import { BattleReportsController } from './battle-reports.controller';
import { ChallengesModule } from '../challenges/challenges.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BattleReport, Challenge]),
    ChallengesModule,     // provides AIProviderFactory
    LeaderboardModule,    // provides LeaderboardService
  ],
  controllers: [BattleReportsController],
  providers: [BattleReportsService],
})
export class BattleReportsModule {}
```

更新 `battle-reports.controller.ts`，新增 `POST /reports` 端点（前端 complete 后单独调用生成报告）：

```typescript
// backend/src/battle-reports/battle-reports.controller.ts — 完整替换
import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { BattleReportsService } from './battle-reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class BattleReportsController {
  constructor(private readonly reports: BattleReportsService) {}

  @Post()
  generate(@CurrentUser() user: User, @Body('challengeId') challengeId: string) {
    return this.reports.generate(challengeId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reports.findById(id);
  }

  @Get(':id/image')
  async image(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reports.findById(id);
    if (!report.imageUrl) return res.status(404).send('Image not generated');
    return res.sendFile(path.join(process.cwd(), report.imageUrl));
  }
}
```

- [ ] **Step 6: 写战报 E2E 测试**

```typescript
// backend/test/battle-reports.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BattleReport (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await request(app.getHttpServer()).post('/auth/sms/send').send({ phone: '13600136000' });
    const r = await request(app.getHttpServer()).post('/auth/sms/verify').send({ phone: '13600136000', otp: '123456' });
    token = r.body.accessToken;
  });

  afterAll(() => app.close());

  // 正常场景：complete → POST /reports → 战报含称号和海报URL
  it('POST /reports → 战报含称号和海报URL', async () => {
    // 1. 创建挑战
    const c = await request(app.getHttpServer())
      .post('/challenges').set('Authorization', `Bearer ${token}`)
      .send({ rawText: '预算100元，3人火锅', city: '上海' });
    const challengeId = c.body.id;

    // 2. 完成挑战
    await request(app.getHttpServer())
      .post(`/challenges/${challengeId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ savedAmount: 42 })
      .expect(201);

    // 3. 生成战报
    const res = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ challengeId })
      .expect(201);

    expect(res.body.rankTitle).toBeDefined();
    expect(res.body.percentile).toBeGreaterThanOrEqual(0);
    expect(res.body.imageUrl).toMatch(/\/uploads\/reports\/.+\.png/);
  }, 60000);

  // 边界场景：战报 GET 不存在 ID → 404
  it('GET /reports/unknown → 404', () => {
    return request(app.getHttpServer())
      .get('/reports/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  // 边界场景：无 token → 401
  it('POST /reports 无 token → 401', () => {
    return request(app.getHttpServer())
      .post('/reports')
      .send({ challengeId: '00000000-0000-0000-0000-000000000000' })
      .expect(401);
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/battle-reports/ backend/test/battle-reports.e2e-spec.ts
git commit -m "feat: battle report — AI text, Sharp PNG poster, neon arcade style"
```

---

### Task 10: LeaderboardModule

**Files:**
- Create: `backend/src/leaderboard/leaderboard.module.ts`
- Create: `backend/src/leaderboard/leaderboard.service.ts`
- Create: `backend/src/leaderboard/leaderboard.controller.ts`

- [ ] **Step 1: LeaderboardService**

```typescript
// backend/src/leaderboard/leaderboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from '../challenges/challenge.entity';
import { User } from '../users/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Challenge) private readonly challenges: Repository<Challenge>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async getLeaderboard(city: string, limit = 20) {
    return this.users
      .createQueryBuilder('u')
      .leftJoin('u.challenges', 'c', 'c.city = :city AND c.status = :s', { city, s: 'completed' })
      .select(['u.id', 'u.nickname', 'u.avatarUrl', 'u.rankTitle', 'u.totalSaved'])
      .where('u.totalSaved > 0')
      .orderBy('u.totalSaved', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getCityStats(city: string) {
    const result = await this.challenges
      .createQueryBuilder('c')
      .where('c.city = :city AND c.status = :s AND DATE(c.created_at) = CURRENT_DATE', { city, s: 'completed' })
      .select('COUNT(c.id)', 'count')
      .addSelect('COALESCE(SUM(c.saved_amount), 0)', 'totalSaved')
      .getRawOne();
    return {
      city,
      todayCount: parseInt(result?.count ?? '0', 10),
      todayTotalSaved: parseFloat(result?.totalSaved ?? '0'),
    };
  }

  async getHeatmap(city: string) {
    return this.challenges
      .createQueryBuilder('c')
      .leftJoin('c.tasks', 't')
      .leftJoin('t.shop', 's')
      .where('c.city = :city AND c.status = :status', { city, status: 'completed' })
      .select(['s.district', 'COUNT(c.id) as count', 'SUM(c.saved_amount) as saved'])
      .groupBy('s.district')
      .getRawMany();
  }

  async getCityAvgSave(city: string): Promise<number> {
    const result = await this.challenges
      .createQueryBuilder('c')
      .where('c.city = :city AND c.status = :s', { city, s: 'completed' })
      .select('AVG(c.saved_amount)', 'avg')
      .getRawOne();
    return parseFloat(result?.avg ?? '30');
  }
}
```

- [ ] **Step 2: LeaderboardController**

```typescript
// backend/src/leaderboard/leaderboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly lb: LeaderboardService) {}

  @Get('leaderboard')
  getLeaderboard(@Query('city') city: string, @Query('limit') limit?: string) {
    return this.lb.getLeaderboard(city, limit ? parseInt(limit, 10) : 20);
  }

  @Get('stats/city')
  getCityStats(@Query('city') city: string) {
    return this.lb.getCityStats(city);
  }

  @Get('heatmap')
  getHeatmap(@Query('city') city: string) {
    return this.lb.getHeatmap(city);
  }
}
```

- [ ] **Step 3: LeaderboardModule + 最终 AppModule**

```typescript
// backend/src/leaderboard/leaderboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '../challenges/challenge.entity';
import { User } from '../users/user.entity';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, User])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],   // BattleReportsModule 依赖此导出
})
export class LeaderboardModule {}
```

更新 `app.module.ts` 完整版（含全部模块）：

```typescript
// backend/src/app.module.ts — 最终版
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ShopsModule } from './shops/shops.module';
import { ChallengesModule } from './challenges/challenges.module';
import { BattleReportsModule } from './battle-reports/battle-reports.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ShopsModule,
    ChallengesModule,
    LeaderboardModule,
    BattleReportsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/leaderboard/ backend/src/battle-reports/ backend/src/app.module.ts
git commit -m "feat: leaderboard — city ranking, heatmap, daily stats; wire all modules into AppModule"
```

---

## Plan C 完成标准

- [ ] AI 挑战生成 SSE 流式正常，前端能接收逐条任务事件
- [ ] Challenge E2E：AI 决策测试（3套方案含主/支/隐）、安全护栏测试、边界测试全部 PASS
- [ ] BattleReport 生成 PNG 文件，能通过 `/reports/:id/image` 访问
- [ ] Leaderboard API 返回真实聚合数据
- [ ] Git 4 个原子提交
