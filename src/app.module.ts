import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Leaderboard } from './leaderboard/leaderboard.entity';
import { LeaderboardConfig } from './leaderboard/leaderboard-config.entity';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: 'mysql://avnadmin:AVNS_PlSCPYcbpAsfDpcvCJV@leaderboard-service-vule-academy-project.h.aivencloud.com:17504/defaultdb?ssl-mode=REQUIRED',
      entities: [Leaderboard, LeaderboardConfig],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Leaderboard, LeaderboardConfig]),
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      type: 'single',
      url: 'rediss://red-cr7ibujv2p9s73a4pang:9ODaCi3vL1YsOwmOAk6rw5HVB4sBhv1k@singapore-redis.render.com:6379',
    }),
    LeaderboardModule,
  ],
})
export class AppModule {}
