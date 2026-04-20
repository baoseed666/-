import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from './shop.entity';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { TransitModule } from '../transit/transit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shop]), TransitModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
