import { IsArray, IsIn, IsOptional } from 'class-validator';

export class QuizDto {
  @IsArray()
  answers: any[];

  @IsOptional()
  @IsIn(['quick', 'deep'])
  mode?: 'quick' | 'deep';
}
