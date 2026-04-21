import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmotionProfile } from './emotion-profile.entity';
import { EmotionCheckin } from './emotion-checkin.entity';
import { User } from '../users/user.entity';
import { EmotionService } from './emotion.service';
import { EmotionController } from './emotion.controller';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmotionProfile, EmotionCheckin, User]), ShopsModule],
  controllers: [EmotionController],
  providers: [EmotionService],
})
export class EmotionModule {}
