import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { User } from './user.entity';

interface ExchangeChannel {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  value: string;
  category: string;
  jumpUrl: string;
}

const EXCHANGE_CHANNELS: ExchangeChannel[] = [
  {
    id: 'pdd-coupon',
    name: '拼多多无门槛券',
    description: '可用于拼多多任意商品下单',
    pointsCost: 300,
    value: '3元无门槛券',
    category: '电商',
    jumpUrl: 'https://mobile.yangkeduo.com/duo_coupon_land.html',
  },
  {
    id: 'luckin-5',
    name: '瑞幸咖啡5元券',
    description: '龙华区瑞幸咖啡门店通用',
    pointsCost: 500,
    value: '5元优惠券',
    category: '咖啡',
    jumpUrl: 'https://i.meituan.com/awp/h5/search.html?q=%E7%91%9E%E5%B9%B8%E5%92%96%E5%95%A1&city=%E9%BE%99%E5%8D%8E',
  },
  {
    id: 'meituan-5',
    name: '美团外卖5元抵用',
    description: '满20元可用，龙华区范围内配送',
    pointsCost: 800,
    value: '5元抵用券',
    category: '餐饮',
    jumpUrl: 'https://i.meituan.com/awp/h5/hongbao.html',
  },
  {
    id: 'longhua-movie',
    name: '龙华会电影半价',
    description: '上海徐汇区龙华会电影院通用半价票',
    pointsCost: 2000,
    value: '半价电影票',
    category: '娱乐',
    jumpUrl: 'https://m.dianping.com/search/keyword/1/0_%E9%BE%99%E5%8D%8E%E7%94%B5%E5%BD%B1',
  },
  {
    id: 'dianping-50',
    name: '大众点评50元代金券',
    description: '上海徐汇区龙华餐厅通用代金券',
    pointsCost: 3000,
    value: '50元代金券',
    category: '餐饮',
    jumpUrl: 'https://m.dianping.com/search/keyword/1/0_%E9%BE%99%E5%8D%8E%E9%A4%90%E5%8E%85',
  },
];

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const fresh = await this.usersService.findById(user.id);
    if (!fresh) return null;
    return {
      id: fresh.id,
      nickname: fresh.nickname,
      avatarUrl: fresh.avatarUrl,
      totalSaved: fresh.totalSaved,
      rankTitle: fresh.rankTitle,
      points: fresh.points,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/challenges')
  getMyChallengyes(@CurrentUser() user: User) {
    return this.usersService.getMyChallenges(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/points')
  async getMyPoints(@CurrentUser() user: User) {
    const fresh = await this.usersService.findById(user.id);
    return { points: fresh?.points ?? 0, channels: EXCHANGE_CHANNELS };
  }
}
