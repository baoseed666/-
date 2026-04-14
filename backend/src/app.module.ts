import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
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
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ShopsModule,
    ChallengesModule,
    LeaderboardModule,
    BattleReportsModule,
    LbsModule,
  ],
})
export class AppModule {}
