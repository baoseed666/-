import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'varchar', nullable: true })
  district: string;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lng: number;

  @Column({
    name: 'avg_price',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  avgPrice: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  discounts: Record<string, string>;

  /** 优惠类型标签: 神券 / 团购 / 促销 */
  @Column({ name: 'discount_types', type: 'text', array: true, default: '{}' })
  discountTypes: string[];

  @Column({ name: 'open_hours', type: 'jsonb', default: '{}' })
  openHours: Record<string, string>;

  @Column({
    name: 'external_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  externalId: string | null;

  /** 封面图 URL（大众点评 / 美团 CDN） */
  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** 详细地址 */
  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  /** 跳转到大众点评或美团的详情链接 */
  @Column({ name: 'external_url', type: 'varchar', nullable: true })
  externalUrl: string | null;

  @UpdateDateColumn({ name: 'scraped_at' })
  scrapedAt: Date;
}
