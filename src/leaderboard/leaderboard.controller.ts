import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
// import { EncryptionService } from 'src/encryption/encryption.service';

@Controller('v1/leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService)
    // private readonly encryptionService: EncryptionService,) 
    {}

  @Post(':id/scores')
  async addScore(@Param('id') leaderboardId: string,
    @Body('data') encryptedData: string,
    @Headers('x-api-developer-key') apiKey: string ,
  ) {
    // const decryptedData = this.encryptionService.decrypt(encryptedData, apiKey);
    return this.leaderboardService.addScore(encryptedData, leaderboardId, apiKey);
  }
}
