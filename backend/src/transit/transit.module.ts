import { Module } from '@nestjs/common';
import { AmapService } from './amap.service';
import { BaiduService } from './baidu.service';
import { TransitController } from './transit.controller';

@Module({
  providers: [AmapService, BaiduService],
  controllers: [TransitController],
  exports: [AmapService, BaiduService],
})
export class TransitModule {}
