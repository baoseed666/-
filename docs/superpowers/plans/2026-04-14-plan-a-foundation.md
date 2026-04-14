# 抠门大王 Plan A — 基础设施

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建可运行的 NestJS 后端骨架，完成全部数据库 Schema、SMS+微信双登录、爬虫队列框架。

**Architecture:** NestJS 模块化单体 + TypeORM + PostgreSQL + Redis。Scraper 作为独立进程，通过 Bull 队列与主服务共享 Redis，不耦合主服务代码。Auth 使用策略模式同时支持 SMS 和微信 OAuth，JWT 双 Token 体系。

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL 15, Redis 7, Bull 4, passport-jwt, @nestjs/websockets

---

## 文件结构

```
D:/projects/抠门大王/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── configuration.ts          # 统一配置对象，所有 env 集中定义
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts     # 全局 JWT 守卫
│   │   │   └── decorators/
│   │   │       └── current-user.decorator.ts
│   │   ├── database/
│   │   │   └── database.module.ts        # TypeORM 异步配置
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   └── user.entity.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts           # SMS + 微信 两种登录，返回同一 JWT 结构
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── sms-send.dto.ts
│   │   │       ├── sms-verify.dto.ts
│   │   │       └── wechat-callback.dto.ts
│   │   ├── shops/
│   │   │   └── shop.entity.ts            # Plan A 只建 Entity，Service 在 Plan B
│   │   ├── challenges/
│   │   │   ├── challenge.entity.ts
│   │   │   └── challenge-task.entity.ts
│   │   ├── battle-reports/
│   │   │   └── battle-report.entity.ts
│   │   └── lbs/
│   │       └── lbs-request.entity.ts
│   ├── scraper/
│   │   ├── main.ts                       # 独立进程入口
│   │   ├── scraper.module.ts
│   │   └── scraper.processor.ts          # Bull 消费者框架，Plan B 填充实现
│   ├── test/
│   │   └── auth.e2e-spec.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── frontend/                             # Plan D 创建，Plan A 留空
└── docker-compose.yml                    # PostgreSQL + Redis 本地开发环境
```

---

### Task 1: 项目脚手架 + Docker 开发环境

**Files:**
- Create: `D:/projects/抠门大王/docker-compose.yml`
- Create: `D:/projects/抠门大王/backend/` (NestJS 项目)
- Create: `D:/projects/抠门大王/backend/.env.example`
- Create: `D:/projects/抠门大王/backend/src/config/configuration.ts`

- [ ] **Step 1: 初始化 backend**

```bash
cd D:/projects/抠门大王
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend
npm install @nestjs/config @nestjs/typeorm typeorm pg \
  @nestjs/jwt passport passport-jwt @nestjs/passport \
  bcryptjs class-validator class-transformer \
  @nestjs/bullmq bullmq ioredis \
  @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/passport-jwt @types/bcryptjs
```

- [ ] **Step 2: 创建 docker-compose.yml**

```yaml
# D:/projects/抠门大王/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: koumen
      POSTGRES_USER: koumen
      POSTGRES_PASSWORD: koumen123
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

- [ ] **Step 3: 启动开发环境**

```bash
cd D:/projects/抠门大王
docker-compose up -d
```

Expected: `postgres` 和 `redis` 容器 `Up` 状态

- [ ] **Step 4: 创建 .env.example 和 .env**

```bash
# backend/.env.example
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=koumen
DB_USER=koumen
DB_PASSWORD=koumen123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMS (Demo mode: OTP固定123456，生产时填真实服务商)
SMS_DEMO_MODE=true
SMS_PROVIDER_URL=
SMS_API_KEY=

# WeChat
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_REDIRECT_URI=http://localhost:5173/auth/wechat/callback

# DeepSeek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Claude (fallback)
ANTHROPIC_API_KEY=
```

```bash
cp backend/.env.example backend/.env
# 填写 DEEPSEEK_API_KEY 和 ANTHROPIC_API_KEY
```

- [ ] **Step 5: 创建配置模块**

```typescript
// backend/src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  sms: {
    demoMode: process.env.SMS_DEMO_MODE === 'true',
    providerUrl: process.env.SMS_PROVIDER_URL,
    apiKey: process.env.SMS_API_KEY,
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET,
    redirectUri: process.env.WECHAT_REDIRECT_URI,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
});
```

- [ ] **Step 6: 更新 app.module.ts**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: 验证启动**

```bash
cd backend && npm run start:dev
```

Expected: `NestJS 应用运行在 http://localhost:3000`，无报错

- [ ] **Step 8: Commit**

```bash
cd D:/projects/抠门大王
git add .
git commit -m "feat: scaffold backend + docker dev environment"
```

---

### Task 2: 全量数据库 Schema（所有 Entity）

**Files:**
- Create: `backend/src/database/database.module.ts`
- Create: `backend/src/users/user.entity.ts`
- Create: `backend/src/shops/shop.entity.ts`
- Create: `backend/src/challenges/challenge.entity.ts`
- Create: `backend/src/challenges/challenge-task.entity.ts`
- Create: `backend/src/battle-reports/battle-report.entity.ts`
- Create: `backend/src/lbs/lbs-request.entity.ts`

- [ ] **Step 1: 创建 DatabaseModule**

```typescript
// backend/src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Shop } from '../shops/shop.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChallengeTask } from '../challenges/challenge-task.entity';
import { BattleReport } from '../battle-reports/battle-report.entity';
import { LbsRequest } from '../lbs/lbs-request.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('db.host'),
        port: cfg.get('db.port'),
        database: cfg.get('db.name'),
        username: cfg.get('db.user'),
        password: cfg.get('db.password'),
        entities: [User, Shop, Challenge, ChallengeTask, BattleReport, LbsRequest],
        synchronize: cfg.get('nodeEnv') === 'development',
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
```

- [ ] **Step 2: User Entity**

```typescript
// backend/src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Challenge } from '../challenges/challenge.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'wechat_openid', unique: true, nullable: true })
  wechatOpenid: string | null;

  @Column({ default: '匿名抠门人' })
  nickname: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'total_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSaved: number;

  @Column({ name: 'rank_title', default: '消费韭菜' })
  rankTitle: string;

  @OneToMany(() => Challenge, (c) => c.user)
  challenges: Challenge[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 3: Shop Entity**

```typescript
// backend/src/shops/shop.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

@Entity('shops')
@Index(['city', 'category'])
@Index(['lat', 'lng'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  district: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ name: 'avg_price', type: 'decimal', precision: 8, scale: 2, nullable: true })
  avgPrice: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  discounts: Record<string, unknown>;

  @Column({ name: 'open_hours', type: 'jsonb', default: '{}' })
  openHours: Record<string, unknown>;

  @Column({ name: 'external_id', nullable: true })
  externalId: string | null;

  @UpdateDateColumn({ name: 'scraped_at' })
  scrapedAt: Date;
}
```

- [ ] **Step 4: Challenge + ChallengeTask Entities**

```typescript
// backend/src/challenges/challenge.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ChallengeTask } from './challenge-task.entity';
import { BattleReport } from '../battle-reports/battle-report.entity';

export enum ChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.challenges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'input_text' })
  inputText: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ name: 'people_count', default: 1 })
  peopleCount: number;

  @Column()
  city: string;

  @Column({ type: 'enum', enum: ChallengeStatus, default: ChallengeStatus.ACTIVE })
  status: ChallengeStatus;

  @Column({ name: 'saved_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  savedAmount: number;

  @OneToMany(() => ChallengeTask, (t) => t.challenge, { cascade: true })
  tasks: ChallengeTask[];

  @OneToOne(() => BattleReport, (r) => r.challenge)
  report: BattleReport;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

```typescript
// backend/src/challenges/challenge-task.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Shop } from '../shops/shop.entity';

export enum TaskType { MAIN = 'main', SIDE = 'side', HIDDEN = 'hidden' }
export enum TaskStatus { PENDING = 'pending', DONE = 'done', SKIPPED = 'skipped' }

@Entity('challenge_tasks')
export class ChallengeTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Challenge, (c) => c.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column()
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tips: string[];

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
```

- [ ] **Step 5: BattleReport + LbsRequest Entities**

```typescript
// backend/src/battle-reports/battle-report.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Challenge } from '../challenges/challenge.entity';

@Entity('battle_reports')
export class BattleReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Challenge, (c) => c.report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column()
  headline: string;

  @Column({ name: 'rank_title' })
  rankTitle: string;

  @Column({ type: 'int', default: 0 })
  percentile: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

```typescript
// backend/src/lbs/lbs-request.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Shop } from '../shops/shop.entity';

export enum LbsStatus { WAITING = 'waiting', MATCHED = 'matched', EXPIRED = 'expired' }

@Entity('lbs_requests')
export class LbsRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'enum', enum: LbsStatus, default: LbsStatus.WAITING })
  status: LbsStatus;

  @Column({ name: 'matched_user_id', nullable: true })
  matchedUserId: string | null;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 6: 验证 TypeORM 同步建表**

```bash
cd backend && npm run start:dev
```

观察日志确认无报错，或连接 PostgreSQL 验证：

```bash
docker exec -it $(docker ps -qf name=postgres) psql -U koumen -d koumen -c "\dt"
```

Expected: 列出 `users, shops, challenges, challenge_tasks, battle_reports, lbs_requests` 6 张表

- [ ] **Step 7: Commit**

```bash
cd D:/projects/抠门大王
git add backend/src/
git commit -m "feat: define all TypeORM entities and database schema"
```

---

### Task 3: AuthModule — SMS + 微信 OAuth 双登录

**Files:**
- Create: `backend/src/users/users.module.ts`
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/dto/sms-send.dto.ts`
- Create: `backend/src/auth/dto/sms-verify.dto.ts`
- Create: `backend/src/auth/dto/wechat-callback.dto.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/test/auth.e2e-spec.ts`

- [ ] **Step 1: UsersService**

```typescript
// backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string) { return this.repo.findOneBy({ id }); }
  findByPhone(phone: string) { return this.repo.findOneBy({ phone }); }
  findByWechatOpenid(openid: string) { return this.repo.findOneBy({ wechatOpenid: openid }); }

  async upsertByPhone(phone: string): Promise<User> {
    let user = await this.findByPhone(phone);
    if (!user) {
      user = this.repo.create({ phone });
      await this.repo.save(user);
    }
    return user;
  }

  async upsertByWechat(openid: string, nickname: string, avatarUrl: string): Promise<User> {
    let user = await this.findByWechatOpenid(openid);
    if (!user) {
      user = this.repo.create({ wechatOpenid: openid, nickname, avatarUrl });
    } else {
      user.nickname = nickname;
      user.avatarUrl = avatarUrl;
    }
    return this.repo.save(user);
  }

  updateRankTitle(id: string, totalSaved: number): Promise<User> {
    const rankTitle = this.computeRank(totalSaved);
    return this.repo.save({ id, totalSaved, rankTitle } as User);
  }

  private computeRank(totalSaved: number): string {
    if (totalSaved >= 10000) return '传说级穷鬼';
    if (totalSaved >= 5000) return '抠门大王';
    if (totalSaved >= 1000) return '抠门高手';
    if (totalSaved >= 200) return '省钱老手';
    if (totalSaved >= 50) return '薅羊毛学徒';
    return '消费韭菜';
  }
}
```

- [ ] **Step 2: AuthService（SMS + 微信，统一 JWT 签发）**

```typescript
// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis'; // or use ioredis directly
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // ── SMS ──────────────────────────────────────────────
  async sendSms(phone: string): Promise<void> {
    const otp = this.config.get('sms.demoMode') ? '123456' : this.generateOtp();
    await this.redis.setex(`sms:${phone}`, 300, otp); // 5分钟过期
    if (!this.config.get('sms.demoMode')) {
      await this.dispatchSms(phone, otp);
    }
  }

  async verifySms(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.redis.get(`sms:${phone}`);
    if (!stored || stored !== otp) throw new UnauthorizedException('验证码错误或已过期');
    await this.redis.del(`sms:${phone}`);
    const user = await this.users.upsertByPhone(phone);
    return this.issueTokens(user);
  }

  // ── WeChat ───────────────────────────────────────────
  async wechatCallback(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { openid, nickname, avatarUrl } = await this.exchangeWechatCode(code);
    const user = await this.users.upsertByWechat(openid, nickname, avatarUrl);
    return this.issueTokens(user);
  }

  // ── Token ────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored) throw new UnauthorizedException('Refresh token 无效或已过期');
    const { userId } = JSON.parse(stored);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const accessToken = this.jwt.sign({ sub: user.id }, {
      expiresIn: this.config.get('jwt.accessExpires'),
    });
    return { accessToken };
  }

  // ── Private ──────────────────────────────────────────
  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id });
    const refreshToken = crypto.randomUUID();
    await this.redis.setex(
      `refresh:${refreshToken}`,
      7 * 24 * 3600,
      JSON.stringify({ userId: user.id }),
    );
    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async dispatchSms(phone: string, otp: string): Promise<void> {
    // 生产：调用真实短信服务商 API
    // const url = this.config.get('sms.providerUrl');
    // await fetch(url, { method: 'POST', body: JSON.stringify({ phone, otp }) });
    throw new Error('SMS provider not configured');
  }

  private async exchangeWechatCode(code: string) {
    const appId = this.config.get('wechat.appId');
    const appSecret = this.config.get('wechat.appSecret');
    const res = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`,
    );
    const data: any = await res.json();
    if (data.errcode) throw new BadRequestException(`微信授权失败: ${data.errmsg}`);

    const infoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${data.access_token}&openid=${data.openid}`,
    );
    const info: any = await infoRes.json();
    return { openid: data.openid, nickname: info.nickname ?? '微信用户', avatarUrl: info.headimgurl ?? '' };
  }
}
```

- [ ] **Step 3: JWT Strategy + Guard + Decorator**

```typescript
// backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly users: UsersService) {
    super({
      // Support both header (REST) and query param (SSE EventSource can't set headers)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => (req?.query?.token as string) ?? null,
      ]),
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: { sub: string }) {
    return this.users.findById(payload.sub);
  }
}
```

```typescript
// backend/src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 4: AuthController**

```typescript
// backend/src/auth/auth.controller.ts
import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SmsSendDto } from './dto/sms-send.dto';
import { SmsVerifyDto } from './dto/sms-verify.dto';
import { WechatCallbackDto } from './dto/wechat-callback.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sms/send')
  @HttpCode(200)
  sendSms(@Body() dto: SmsSendDto) {
    return this.auth.sendSms(dto.phone).then(() => ({ message: 'OTP sent' }));
  }

  @Post('sms/verify')
  verifySms(@Body() dto: SmsVerifyDto) {
    return this.auth.verifySms(dto.phone, dto.otp);
  }

  @Post('wechat/callback')
  wechatCallback(@Body() dto: WechatCallbackDto) {
    return this.auth.wechatCallback(dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refresh(token);
  }
}
```

- [ ] **Step 5: DTOs**

```typescript
// backend/src/auth/dto/sms-send.dto.ts
import { IsString, Matches } from 'class-validator';
export class SmsSendDto {
  @IsString() @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式错误' })
  phone: string;
}

// backend/src/auth/dto/sms-verify.dto.ts
import { IsString, Length, Matches } from 'class-validator';
export class SmsVerifyDto {
  @IsString() @Matches(/^1[3-9]\d{9}$/)
  phone: string;
  @IsString() @Length(6, 6)
  otp: string;
}

// backend/src/auth/dto/wechat-callback.dto.ts
import { IsString } from 'class-validator';
export class WechatCallbackDto {
  @IsString() code: string;
}
```

- [ ] **Step 6: 安装 ioredis 模块并注册**

```bash
cd backend && npm install @nestjs-modules/ioredis ioredis
```

在 `auth.module.ts` 和 `app.module.ts` 中注册 RedisModule：

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('jwt.secret'),
        signOptions: { expiresIn: cfg.get('jwt.accessExpires') },
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'single',
        url: `redis://${cfg.get('redis.host')}:${cfg.get('redis.port')}`,
      }),
    }),
    TypeOrmModule.forFeature([User]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 7: 写 Auth E2E 测试（SMS 正常 + 异常场景）**

```typescript
// backend/test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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

  // ── 正常场景 ───────────────────────────────────────
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

  // ── 异常场景 ───────────────────────────────────────
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
```

- [ ] **Step 8: 运行 E2E 测试**

```bash
cd backend && npm run test:e2e
```

Expected: 全部 5 个测试 PASS

- [ ] **Step 9: Commit**

```bash
cd D:/projects/抠门大王
git add backend/
git commit -m "feat: auth module — SMS + WeChat OAuth, JWT dual-token, e2e tests"
```

---

### Task 4: Scraper Worker 框架（Bull 队列 + 独立进程入口）

**Files:**
- Create: `backend/scraper/main.ts`
- Create: `backend/scraper/scraper.module.ts`
- Create: `backend/scraper/scraper.processor.ts`
- Create: `backend/src/admin/admin.module.ts`
- Create: `backend/src/admin/scraper-admin.controller.ts`
- Modify: `backend/package.json` (新增 scraper 启动脚本)
- Modify: `backend/nest-cli.json` (注册 scraper 入口)

- [ ] **Step 1: 安装 Puppeteer**

```bash
cd backend && npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

- [ ] **Step 2: Scraper Processor（Bull 消费者框架）**

```typescript
// backend/scraper/scraper.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface ScrapeJob {
  city: string;
  category: string;
  page?: number;
}

@Processor('scraper')
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  async process(job: Job<ScrapeJob>): Promise<void> {
    this.logger.log(`Processing: ${job.data.city} / ${job.data.category} page ${job.data.page ?? 1}`);
    // Plan B 中填充 Puppeteer 实现
    await this.scrapePage(job.data);
  }

  private async scrapePage(_data: ScrapeJob): Promise<void> {
    // 实现在 Plan B Task 5
    throw new Error('Not implemented — see Plan B');
  }
}
```

- [ ] **Step 3: Scraper Module**

```typescript
// backend/scraper/scraper.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperProcessor } from './scraper.processor';
import { Shop } from '../src/shops/shop.entity';
import configuration from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { host: cfg.get('redis.host'), port: cfg.get('redis.port') },
      }),
    }),
    BullModule.registerQueue({ name: 'scraper' }),
    TypeOrmModule.forFeature([Shop]),
  ],
  providers: [ScraperProcessor],
})
export class ScraperModule {}
```

- [ ] **Step 4: Scraper 进程入口**

```typescript
// backend/scraper/main.ts
import { NestFactory } from '@nestjs/core';
import { ScraperModule } from './scraper.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ScraperModule);
  console.log('Scraper worker started');
  // 保持进程存活，等待 Bull 队列任务
}

bootstrap();
```

- [ ] **Step 5: Admin Controller（触发爬虫）**

```typescript
// backend/src/admin/scraper-admin.controller.ts
import { Controller, Post, Get, Body } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScrapeJob } from '../../scraper/scraper.processor';

const CITIES = ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '西安'];
const CATEGORIES = ['餐饮', '娱乐', '购物'];

@Controller('admin/scraper')
export class ScraperAdminController {
  constructor(@InjectQueue('scraper') private readonly queue: Queue) {}

  @Post('start')
  async start(@Body('city') city?: string, @Body('category') category?: string) {
    const cities = city ? [city] : CITIES;
    const cats = category ? [category] : CATEGORIES;
    const jobs: ScrapeJob[] = cities.flatMap((c) => cats.map((cat) => ({ city: c, category: cat, page: 1 })));
    await this.queue.addBulk(jobs.map((data) => ({ name: 'scrape', data, opts: { attempts: 3, backoff: 5000 } })));
    return { enqueued: jobs.length, cities, categories: cats };
  }

  @Get('status')
  async status() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
```

- [ ] **Step 5b: 创建 AdminModule（注册 BullModule + Controller）**

```typescript
// backend/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ScraperAdminController } from './scraper-admin.controller';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { host: cfg.get('redis.host'), port: cfg.get('redis.port') },
      }),
    }),
    BullModule.registerQueue({ name: 'scraper' }),
  ],
  controllers: [ScraperAdminController],
})
export class AdminModule {}
```

在 `app.module.ts` 的 imports 中追加 `AdminModule`：

```typescript
// backend/src/app.module.ts — 追加 AdminModule
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: 更新 nest-cli.json 注册 scraper 入口**

```json
// backend/nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "projects": {
    "app": { "type": "application", "root": ".", "entryFile": "main", "sourceRoot": "src" },
    "scraper": { "type": "application", "root": ".", "entryFile": "scraper/main", "sourceRoot": "." }
  }
}
```

- [ ] **Step 7: 更新 package.json 脚本**

在 `backend/package.json` scripts 中追加：

```json
"start:scraper": "nest start scraper",
"start:scraper:dev": "nest start scraper --watch"
```

- [ ] **Step 8: 验证 scraper 进程启动**

```bash
cd backend && npm run start:scraper:dev
```

Expected: `Scraper worker started` 日志，进程保持存活等待任务

- [ ] **Step 9: Commit**

```bash
cd D:/projects/抠门大王
git add backend/
git commit -m "feat: scraper worker framework — Bull queue, admin trigger, independent process"
```

---

## Plan A 完成标准

- [ ] `docker-compose up -d` 后 postgres + redis 均运行
- [ ] `npm run start:dev` 无报错，TypeORM 自动建表
- [ ] `npm run test:e2e` Auth 全部 5 个用例 PASS
- [ ] `npm run start:scraper:dev` 爬虫进程正常启动
- [ ] Git 共 4 个原子提交，每个模块独立提交
