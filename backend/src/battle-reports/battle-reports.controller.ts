import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as path from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { BattleReportsService } from './battle-reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class BattleReportsController {
  constructor(private readonly battleReports: BattleReportsService) {}

  @Post()
  generate(
    @CurrentUser() user: User,
    @Body('challengeId') challengeId: string,
  ) {
    return this.battleReports.generate(challengeId, user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.battleReports.findById(id);
  }

  @Get(':id/image')
  async sendImage(@Param('id') id: string, @Res() res: Response) {
    const report = await this.battleReports.findById(id);
    const filename = `${report.id}.png`;
    const filePath = path.join(process.cwd(), 'uploads', 'reports', filename);
    res.sendFile(filePath);
  }
}
