import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Leaderboard } from './leaderboard/leaderboard.entity';
import { LeaderboardConfig } from './leaderboard/leaderboard-config.entity';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Để ConfigModule có sẵn toàn bộ app
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Leaderboard, LeaderboardConfig],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Leaderboard, LeaderboardConfig]),
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    LeaderboardModule,
  ],
})
export class AppModule {}
