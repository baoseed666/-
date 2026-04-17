import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get('recommend')
  recommend(
    @Query('city') city: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('category') category?: string,
    @Query('budget') budget?: string,
    @Query('discountTypes') discountTypes?: string,
    @Query('openNow') openNow?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shops.recommendShops({
      city,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      category,
      budget: budget ? parseFloat(budget) : undefined,
      discountTypes: discountTypes
        ? discountTypes.split(',').map((s) => s.trim())
        : undefined,
      openNow: openNow === 'true',
      limit: limit ? parseInt(limit, 10) : 5,
    });
  }

  @Get()
  search(
    @Query('city') city: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shops.search({
      city,
      category,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shops.findById(id);
  }
}
