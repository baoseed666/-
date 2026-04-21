import { IsString, IsNumber } from 'class-validator';

export class CheckinDto {
  @IsString()
  locationName: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  emotionLabel: string;
}
