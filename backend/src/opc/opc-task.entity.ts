import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('opc_tasks')
export class OpcTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() merchantName: string;
  @Column({ type: 'enum', enum: ['摄影', '内容', '导览'] }) taskType: string;
  @Column() title: string;
  @Column('text') description: string;
  @Column({ type: 'int' }) pointsReward: number;
  @Column({ type: 'enum', enum: ['open', 'taken', 'done'], default: 'open' }) status: string;
  @Column({ nullable: true }) takenByUserId: string;
  @CreateDateColumn() createdAt: Date;
}
