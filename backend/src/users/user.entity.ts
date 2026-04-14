import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Challenge } from '../challenges/challenge.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'wechat_openid', unique: true, nullable: true })
  wechatOpenid: string | null;

  @Column({ default: '匿名抠门人' })
  nickname: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'total_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSaved: number;

  @Column({ name: 'rank_title', default: '消费韭菜' })
  rankTitle: string;

  @OneToMany(() => Challenge, (c) => c.user)
  challenges: Challenge[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
