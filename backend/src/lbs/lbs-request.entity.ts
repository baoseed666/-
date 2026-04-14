import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Shop } from '../shops/shop.entity';

export enum LbsStatus { WAITING = 'waiting', MATCHED = 'matched', EXPIRED = 'expired' }

@Entity('lbs_requests')
export class LbsRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lng: number;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'enum', enum: LbsStatus, default: LbsStatus.WAITING })
  status: LbsStatus;

  @Column({ name: 'matched_user_id', type: 'varchar', nullable: true })
  matchedUserId: string | null;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
