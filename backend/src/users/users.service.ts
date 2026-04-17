import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }
  findByPhone(phone: string) {
    return this.repo.findOneBy({ phone });
  }
  findByWechatOpenid(openid: string) {
    return this.repo.findOneBy({ wechatOpenid: openid });
  }

  async upsertByPhone(phone: string): Promise<User> {
    let user = await this.findByPhone(phone);
    if (!user) {
      user = this.repo.create({ phone });
      await this.repo.save(user);
    }
    return user;
  }

  async upsertByWechat(
    openid: string,
    nickname: string,
    avatarUrl: string,
  ): Promise<User> {
    let user = await this.findByWechatOpenid(openid);
    if (!user) {
      user = this.repo.create({ wechatOpenid: openid, nickname, avatarUrl });
    } else {
      user.nickname = nickname;
      user.avatarUrl = avatarUrl;
    }
    return this.repo.save(user);
  }

  updateRankTitle(id: string, totalSaved: number): Promise<User> {
    const rankTitle = this.computeRank(totalSaved);
    return this.repo.save({ id, totalSaved, rankTitle } as User);
  }

  private computeRank(totalSaved: number): string {
    if (totalSaved >= 10000) return '传说级穷鬼';
    if (totalSaved >= 5000) return '抠门大王';
    if (totalSaved >= 1000) return '抠门高手';
    if (totalSaved >= 200) return '省钱老手';
    if (totalSaved >= 50) return '薅羊毛学徒';
    return '消费韭菜';
  }
}
