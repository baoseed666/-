import { Module } from '@nestjs/common';
import { AmapService } from './amap.service';
import { TransitController } from './transit.controller';

@Module({
  providers: [AmapService],
  controllers: [TransitController],
  exports: [AmapService],
})
export class TransitModule {}
