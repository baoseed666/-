import { IsString } from 'class-validator';

export class WechatCallbackDto {
  @IsString()
  code: string;
}
