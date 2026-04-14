import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async sendSms(phone: string): Promise<void> {
    const otp = this.config.get('sms.demoMode') ? '123456' : this.generateOtp();
    await this.redis.setex(`sms:${phone}`, 300, otp);
    if (!this.config.get('sms.demoMode')) {
      await this.dispatchSms(phone, otp);
    }
  }

  async verifySms(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.redis.get(`sms:${phone}`);
    if (!stored || stored !== otp) throw new UnauthorizedException('验证码错误或已过期');
    await this.redis.del(`sms:${phone}`);
    const user = await this.users.upsertByPhone(phone);
    return this.issueTokens(user);
  }

  async wechatCallback(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { openid, nickname, avatarUrl } = await this.exchangeWechatCode(code);
    const user = await this.users.upsertByWechat(openid, nickname, avatarUrl);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored) throw new UnauthorizedException('Refresh token 无效或已过期');
    const { userId } = JSON.parse(stored);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const accessToken = this.jwt.sign({ sub: user.id }, {
      expiresIn: this.config.get('jwt.accessExpires'),
    });
    return { accessToken };
  }

  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign({ sub: user.id });
    const refreshToken = crypto.randomUUID();
    await this.redis.setex(
      `refresh:${refreshToken}`,
      7 * 24 * 3600,
      JSON.stringify({ userId: user.id }),
    );
    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async dispatchSms(_phone: string, _otp: string): Promise<void> {
    throw new Error('SMS provider not configured');
  }

  private async exchangeWechatCode(code: string) {
    const appId = this.config.get('wechat.appId');
    const appSecret = this.config.get('wechat.appSecret');
    const res = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`,
    );
    const data: any = await res.json();
    if (data.errcode) throw new BadRequestException(`微信授权失败: ${data.errmsg}`);
    const infoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${data.access_token}&openid=${data.openid}`,
    );
    const info: any = await infoRes.json();
    return { openid: data.openid, nickname: info.nickname ?? '微信用户', avatarUrl: info.headimgurl ?? '' };
  }
}
