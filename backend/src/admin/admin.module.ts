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
