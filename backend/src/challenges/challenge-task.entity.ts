import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Shop } from '../shops/shop.entity';

export enum TaskType { MAIN = 'main', SIDE = 'side', HIDDEN = 'hidden' }
export enum TaskStatus { PENDING = 'pending', DONE = 'done', SKIPPED = 'skipped' }

@Entity('challenge_tasks')
export class ChallengeTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Challenge, (c) => c.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column()
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tips: string[];

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
