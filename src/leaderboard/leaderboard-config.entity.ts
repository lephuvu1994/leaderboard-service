import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class LeaderboardConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leaderboardId: string;

  @Column()
  apiKey: string;

  @Column()
  secretKey: string;

  @Column({ default: false })
  isActive: boolean;
}
