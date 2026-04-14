import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

@Entity('shops')
@Index(['city', 'category'])
@Index(['lat', 'lng'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  district: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lng: number;

  @Column({ name: 'avg_price', type: 'decimal', precision: 8, scale: 2, nullable: true })
  avgPrice: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  discounts: Record<string, unknown>;

  @Column({ name: 'open_hours', type: 'jsonb', default: '{}' })
  openHours: Record<string, unknown>;

  @Column({ name: 'external_id', nullable: true })
  externalId: string | null;

  @UpdateDateColumn({ name: 'scraped_at' })
  scrapedAt: Date;
}
