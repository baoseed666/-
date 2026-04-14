import { IsString, IsNotEmpty } from 'class-validator';
export class CreateChallengeDto {
  @IsString() @IsNotEmpty() rawText: string;
  @IsString() @IsNotEmpty() city: string;
}
