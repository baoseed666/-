import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { ShopsModule } from './shops/shops.module';
import { ChallengesModule } from './challenges/challenges.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { BattleReportsModule } from './battle-reports/battle-reports.module';
import { LbsModule } from './lbs/lbs.module';
import { ScraperModule } from './scraper/scraper.module';
import { CityModule } from './city/city.module';
import { TransitModule } from './transit/transit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'single',
        url: `redis://${cfg.get('redis.host')}:${cfg.get('redis.port')}`,
      }),
    }),
    // BullMQ全局连接配置，只在根模块注册一次
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get('redis.host'),
          port: cfg.get('redis.port'),
        },
      }),
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ShopsModule,
    ScraperModule,
    ChallengesModule,
    LeaderboardModule,
    BattleReportsModule,
    LbsModule,
    CityModule,
    TransitModule,
  ],
})
export class AppModule {}
