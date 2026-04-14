import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LbsRequest } from './lbs-request.entity';
import { LbsGateway } from './lbs.gateway';
import { LbsService } from './lbs.service';

@Module({
  imports: [TypeOrmModule.forFeature([LbsRequest])],
  providers: [LbsGateway, LbsService],
})
export class LbsModule {}
