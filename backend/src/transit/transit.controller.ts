import { Controller, Get, Query, ParseFloatPipe } from '@nestjs/common';
import { AmapService } from './amap.service';

@Controller('transit')
export class TransitController {
  constructor(private readonly amapService: AmapService) {}

  @Get('route')
  getRoute(
    @Query('fromLat', ParseFloatPipe) fromLat: number,
    @Query('fromLng', ParseFloatPipe) fromLng: number,
    @Query('toLat', ParseFloatPipe) toLat: number,
    @Query('toLng', ParseFloatPipe) toLng: number,
  ) {
    return this.amapService.getWalkingRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    );
  }

  @Get('ip-location')
  getIpLocation() {
    return this.amapService.getIpLocation();
  }
}
