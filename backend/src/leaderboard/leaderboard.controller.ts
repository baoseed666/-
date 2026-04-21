import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  getLeaderboard(@Query('city') city: string, @Query('limit') limit?: string) {
    return this.leaderboardService.getLeaderboard(
      city,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('stats/city')
  getCityStats(@Query('city') city: string) {
    return this.leaderboardService.getCityStats(city);
  }

  @UseGuards(JwtAuthGuard)
  @Get('heatmap')
  getHeatmap(@Query('city') city: string) {
    return this.leaderboardService.getHeatmap(city);
  }
}
