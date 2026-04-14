import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleReport } from './battle-report.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChallengesModule } from '../challenges/challenges.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { BattleReportsService } from './battle-reports.service';
import { BattleReportsController } from './battle-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BattleReport, Challenge]),
    ChallengesModule,
    LeaderboardModule,
  ],
  controllers: [BattleReportsController],
  providers: [BattleReportsService],
})
export class BattleReportsModule {}
