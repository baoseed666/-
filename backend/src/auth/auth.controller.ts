import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SmsSendDto } from './dto/sms-send.dto';
import { SmsVerifyDto } from './dto/sms-verify.dto';
import { WechatCallbackDto } from './dto/wechat-callback.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sms/send')
  @HttpCode(200)
  sendSms(@Body() dto: SmsSendDto) {
    return this.auth.sendSms(dto.phone).then(() => ({ message: 'OTP sent' }));
  }

  @Post('sms/verify')
  verifySms(@Body() dto: SmsVerifyDto) {
    return this.auth.verifySms(dto.phone, dto.otp);
  }

  @Post('wechat/callback')
  wechatCallback(@Body() dto: WechatCallbackDto) {
    return this.auth.wechatCallback(dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
