import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Challenge, ChallengeStatus } from '../challenges/challenge.entity';
import { ChallengeTask, TaskStatus } from '../challenges/challenge-task.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ChallengeTask)
    private readonly taskRepo: Repository<ChallengeTask>,
  ) {}

  async getLeaderboard(city: string, limit = 20) {
    return this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.challenges', 'c')
      .where('c.city = :city', { city })
      .select([
        'u.id        AS id',
        'u.nickname  AS nickname',
        'u.avatarUrl AS "avatarUrl"',
        'u.rankTitle AS "rankTitle"',
        'u.total_saved::float AS "totalSaved"',
        'u.points    AS points',
      ])
      .groupBy('u.id')
      .orderBy('"totalSaved"', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        nickname: string;
        avatarUrl: string | null;
        rankTitle: string;
        totalSaved: number;
      }>();
  }

  async getCityStats(
    city: string,
  ): Promise<{ city: string; todayCount: number; todayTotalSaved: number }> {
    const row = await this.challengeRepo
      .createQueryBuilder('c')
      .where('c.city = :city', { city })
      .andWhere('c.status = :status', { status: ChallengeStatus.COMPLETED })
      .andWhere('DATE(c.createdAt) = CURRENT_DATE')
      .select([
        'COUNT(*)::int                         AS "todayCount"',
        'COALESCE(SUM(c.saved_amount::float), 0) AS "todayTotalSaved"',
      ])
      .getRawOne<{ todayCount: number; todayTotalSaved: number }>();

    return {
      city,
      todayCount: row?.todayCount ?? 0,
      todayTotalSaved: row?.todayTotalSaved ?? 0,
    };
  }

  async getHeatmap(
    city: string,
  ): Promise<{ district: string; count: string; saved: string }[]> {
    return this.taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.challenge', 'c')
      .innerJoin('t.shop', 's')
      .where('c.city = :city', { city })
      .andWhere('t.status = :status', { status: TaskStatus.DONE })
      .andWhere('s.district IS NOT NULL')
      .select([
        's.district                             AS district',
        'COUNT(*)::text                         AS count',
        'COALESCE(SUM(c.saved_amount::float), 0)::text AS saved',
      ])
      .groupBy('s.district')
      .orderBy('count', 'DESC')
      .getRawMany<{ district: string; count: string; saved: string }>();
  }

  async getCityAvgSave(city: string): Promise<number> {
    const row = await this.challengeRepo
      .createQueryBuilder('c')
      .where('c.city = :city', { city })
      .andWhere('c.status = :status', { status: ChallengeStatus.COMPLETED })
      .select('COALESCE(AVG(c.saved_amount::float), 0)', 'avg')
      .getRawOne<{ avg: number }>();

    return row?.avg ?? 0;
  }
}
