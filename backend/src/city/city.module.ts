import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CityEvent } from './city-event.entity';
import { CityEventsService } from './city-events.service';
import { CityPulseService } from './city-pulse.service';
import { CityEventsController } from './city-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CityEvent])],
  providers: [CityEventsService, CityPulseService],
  controllers: [CityEventsController],
  exports: [CityEventsService, CityPulseService],
})
export class CityModule {}
