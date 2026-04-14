import { IsString, Length, Matches } from 'class-validator';

export class SmsVerifyDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
