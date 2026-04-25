import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Shop } from '../shops/shop.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChallengeTask } from '../challenges/challenge-task.entity';
import { BattleReport } from '../battle-reports/battle-report.entity';
import { LbsRequest } from '../lbs/lbs-request.entity';
import { CityEvent } from '../city/city-event.entity';
import { EmotionProfile } from '../emotion/emotion-profile.entity';
import { EmotionCheckin } from '../emotion/emotion-checkin.entity';
import { OpcTask } from '../opc/opc-task.entity';

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
        entities: [
          User,
          Shop,
          Challenge,
          ChallengeTask,
          BattleReport,
          LbsRequest,
          CityEvent,
          EmotionProfile,
          EmotionCheckin,
          OpcTask,
        ],
        synchronize: cfg.get('nodeEnv') === 'development',
        logging: false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
