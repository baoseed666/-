import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeTask } from './challenge-task.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ShopsModule } from '../shops/shops.module';
import { CityModule } from '../city/city.module';
import { TransitModule } from '../transit/transit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge, ChallengeTask]),
    ShopsModule,
    CityModule,
    TransitModule,
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, AIProviderFactory],
  exports: [AIProviderFactory],
})
export class ChallengesModule {}
