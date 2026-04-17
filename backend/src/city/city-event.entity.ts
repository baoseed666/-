import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('city_events')
export class CityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  venue: string;

  @Column()
  neighborhood: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '{}' })
  discounts: Record<string, string>;

  @Column({ nullable: true })
  bookingUrl: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ default: 0 })
  costLow: number;

  @Column({ default: 0 })
  costHigh: number;

  @CreateDateColumn()
  createdAt: Date;
}
