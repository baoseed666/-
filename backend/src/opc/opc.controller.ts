import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OpcService } from './opc.service';

@Controller('opc')
export class OpcController {
  constructor(private readonly opcService: OpcService) {}

  @Get('tasks')
  getTasks(@Query('taskType') taskType?: string) {
    return this.opcService.getTasks(taskType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tasks/:id/accept')
  acceptTask(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.opcService.acceptTask(id, req.user.id);
  }
}
