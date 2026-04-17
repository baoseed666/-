import { Controller, Get, Query } from '@nestjs/common';
import { CityEventsService } from './city-events.service';
import { CityPulseService } from './city-pulse.service';

@Controller('city')
export class CityEventsController {
  constructor(
    private readonly eventsService: CityEventsService,
    private readonly pulseService: CityPulseService,
  ) {}

  @Get('events')
  getEvents(@Query('neighborhood') neighborhood: string) {
    return this.eventsService.getActiveEvents(neighborhood);
  }

  @Get('pulse')
  getPulse() {
    return this.pulseService.getPulse();
  }
}
