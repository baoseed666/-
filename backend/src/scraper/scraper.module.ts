import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperProcessor } from './scraper.processor';
import { ShopSeedService } from './shop-seed.service';
import { Shop } from '../shops/shop.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scraper' }),
    TypeOrmModule.forFeature([Shop]),
  ],
  providers: [ScraperProcessor, ShopSeedService],
  exports: [ShopSeedService],
})
export class ScraperModule {}
