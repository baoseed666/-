import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpcTask } from './opc-task.entity';
import { OpcService } from './opc.service';
import { OpcController } from './opc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OpcTask])],
  controllers: [OpcController],
  providers: [OpcService],
})
export class OpcModule {}
