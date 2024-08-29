import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Leaderboard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leaderboardId: string;

  @Column()
  userId: string;

  @Column('int')
  score: number;
}
