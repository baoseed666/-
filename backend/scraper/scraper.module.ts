import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperProcessor } from './scraper.processor';
import { Shop } from '../src/shops/shop.entity';
import configuration from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { host: cfg.get('redis.host'), port: cfg.get('redis.port') },
      }),
    }),
    BullModule.registerQueue({ name: 'scraper' }),
    TypeOrmModule.forFeature([Shop]),
  ],
  providers: [ScraperProcessor],
})
export class ScraperModule {}
