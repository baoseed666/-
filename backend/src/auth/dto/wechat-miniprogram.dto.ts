import { IsString, IsOptional, IsObject } from 'class-validator';

export class WechatMiniprogramDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsObject()
  userInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}
