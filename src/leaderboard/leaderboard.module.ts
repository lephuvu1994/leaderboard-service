import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardConfig } from './leaderboard-config.entity';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardConfigService } from './leaderboard-config.service';
import { LeaderboardController } from './leaderboard.controller';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([Leaderboard, LeaderboardConfig]),  RedisModule.forRoot({
    type: 'single',
    url: 'rediss://red-cr7ibujv2p9s73a4pang:9ODaCi3vL1YsOwmOAk6rw5HVB4sBhv1k@singapore-redis.render.com:6379',
  }),],
  providers: [LeaderboardService, LeaderboardConfigService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
