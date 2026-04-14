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
  exports: [AIProviderFactory],
})
export class ChallengesModule {}
