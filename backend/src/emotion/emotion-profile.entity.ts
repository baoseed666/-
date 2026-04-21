import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('emotion_profiles')
export class EmotionProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb' })
  answers: any[];

  @Column({ name: 'emotion_label', type: 'varchar' })
  emotionLabel: string;

  @Column({ name: 'route_summary', type: 'text' })
  routeSummary: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
