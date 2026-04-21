import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('emotion_checkins')
export class EmotionCheckin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'location_name', type: 'varchar' })
  locationName: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ name: 'emotion_label', type: 'varchar' })
  emotionLabel: string;

  @Column({ name: 'points_earned', type: 'int', default: 10 })
  pointsEarned: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
