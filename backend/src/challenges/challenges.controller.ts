import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';
import { User } from '../users/user.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateChallengeDto) {
    return this.challenges.create(user, dto.rawText, dto.city);
  }

  @Get(':id/stream')
  async stream(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const event of this.challenges.streamTasks(
        id,
        lat ? parseFloat(lat) : undefined,
        lng ? parseFloat(lng) : undefined,
      )) {
        res.write(event);
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
    }
    res.end();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.challenges.findWithTasks(id, user.id);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.challenges.updateTaskStatus(id, taskId, user.id, dto.status);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('savedAmount') savedAmount: number,
  ) {
    return this.challenges.complete(id, user.id, savedAmount);
  }
}
