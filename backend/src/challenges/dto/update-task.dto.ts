import { IsEnum } from 'class-validator';
import { TaskStatus } from '../challenge-task.entity';
export class UpdateTaskDto {
  @IsEnum(TaskStatus) status: TaskStatus;
}
