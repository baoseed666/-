import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmotionService } from './emotion.service';
import { User } from '../users/user.entity';
import { QuizDto } from './dto/quiz.dto';
import { CheckinDto } from './dto/checkin.dto';

@Controller('emotion')
@UseGuards(JwtAuthGuard)
export class EmotionController {
  constructor(private readonly emotion: EmotionService) {}

  @Get('questions')
  getQuestions(@Query('mode') mode: 'quick' | 'deep' = 'quick') {
    return this.emotion.getQuestions(mode);
  }

  @Post('quiz')
  async quiz(
    @CurrentUser() user: User,
    @Body() dto: QuizDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const event of this.emotion.streamQuiz(user, dto.answers, dto.mode ?? 'quick')) {
        res.write(event);
      }
    } catch (err) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`,
      );
    }
    res.end();
  }

  @Post('quiz/sync')
  quizSync(@CurrentUser() user: User, @Body() dto: QuizDto) {
    return this.emotion.generateQuizResult(user, dto.answers, dto.mode ?? 'quick');
  }

  @Get('routes')
  getRoutes(@Query('label') label?: string) {
    return this.emotion.getRoutes(label);
  }

  @Post('checkin')
  checkin(@CurrentUser() user: User, @Body() dto: CheckinDto) {
    return this.emotion.checkin(user, dto.locationName, dto.lat, dto.lng, dto.emotionLabel);
  }

  @Get('my-history')
  myHistory(@CurrentUser() user: User) {
    return this.emotion.getMyHistory(user.id);
  }
}
