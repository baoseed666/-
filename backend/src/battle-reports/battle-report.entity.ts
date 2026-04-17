import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Challenge } from '../challenges/challenge.entity';

@Entity('battle_reports')
export class BattleReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Challenge, (c) => c.report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column()
  headline: string;

  @Column({ name: 'rank_title' })
  rankTitle: string;

  @Column({ type: 'int', default: 0 })
  percentile: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
