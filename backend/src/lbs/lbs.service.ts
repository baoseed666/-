import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LbsRequest, LbsStatus } from './lbs-request.entity';

const MATCH_RADIUS_KM = 0.1; // 100m

@Injectable()
export class LbsService {
  private readonly socketMap = new Map<string, string>();

  constructor(@InjectRepository(LbsRequest) private readonly repo: Repository<LbsRequest>) {}

  async joinMatchPool(userId: string, lat: number, lng: number, tags: string[], socketId: string, shopId?: string) {
    this.socketMap.set(userId, socketId);
    await this.repo.upsert(
      {
        user: { id: userId } as any,
        shop: shopId ? ({ id: shopId } as any) : null,
        lat, lng, tags,
        status: LbsStatus.WAITING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { conflictPaths: ['user'] as any },
    );
  }

  async findMatch(userId: string, lat: number, lng: number, tags: string[]): Promise<{ userId: string; requesterSocketId: string } | null> {
    const candidates = await this.repo.find({
      where: { status: LbsStatus.WAITING, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });

    for (const c of candidates) {
      if (c.user.id === userId) continue;
      const dist = this.haversine(lat, lng, c.lat, c.lng);
      const hasCommonTag = tags.some((t) => c.tags.includes(t));
      if (dist <= MATCH_RADIUS_KM && hasCommonTag) {
        return { userId: c.user.id, requesterSocketId: this.socketMap.get(c.user.id) ?? '' };
      }
    }
    return null;
  }

  async confirmMatch(userId1: string, userId2: string) {
    await this.repo.update({ user: { id: userId1 } as any }, { status: LbsStatus.MATCHED, matchedUserId: userId2 });
    await this.repo.update({ user: { id: userId2 } as any }, { status: LbsStatus.MATCHED, matchedUserId: userId1 });
  }

  async cancelRequest(userId: string) {
    await this.repo.delete({ user: { id: userId } as any });
    this.socketMap.delete(userId);
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) { return deg * (Math.PI / 180); }
}
