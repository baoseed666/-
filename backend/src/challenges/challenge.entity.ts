import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ChallengeTask } from './challenge-task.entity';
import { BattleReport } from '../battle-reports/battle-report.entity';
import { AiPlan } from './ai/ai-provider.interface';

export enum ChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.challenges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'input_text' })
  inputText: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  budget: number | null;

  @Column({ name: 'people_count', default: 1 })
  peopleCount: number;

  @Column()
  city: string;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.ACTIVE,
  })
  status: ChallengeStatus;

  @Column({
    name: 'saved_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  savedAmount: number;

  @OneToMany(() => ChallengeTask, (t) => t.challenge, { cascade: true })
  tasks: ChallengeTask[];

  @Column({ type: 'varchar', nullable: true, default: null })
  difficulty: string | null;

  @Column({ name: 'estimated_save', type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  estimatedSave: number | null;

  @Column({ name: 'points_earned', type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ name: 'all_plans', type: 'jsonb', nullable: true, default: null })
  allPlans: AiPlan[] | null;

  @OneToOne(() => BattleReport, (r) => r.challenge)
  report: BattleReport;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
