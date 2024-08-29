// import { Injectable } from '@nestjs/common';
// import { EventPattern, Payload } from '@nestjs/microservices';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Leaderboard } from './leaderboard.entity';

// @Injectable()
// export class LeaderboardConsumer {
//   constructor(
//     @InjectRepository(Leaderboard)
//     private readonly leaderboardRepository: Repository<Leaderboard>,
//   ) {}

//   @EventPattern('add_score_event')
//   async handleAddScore(@Payload() data: any) {
//     const { leaderboardId, scoreData, apiKey } = data;

//     const leaderboardEntry = this.leaderboardRepository.create({
//       leaderboardId,
//       score: scoreData.score,
//       userId: 
//     });

//     await this.leaderboardRepository.save(leaderboardEntry);
//     console.log(`Score saved for leaderboardId: ${leaderboardId}`);
//   }
// }
