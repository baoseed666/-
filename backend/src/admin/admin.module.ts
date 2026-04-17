import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScraperAdminController } from './scraper-admin.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'scraper' })],
  controllers: [ScraperAdminController],
})
export class AdminModule {}
