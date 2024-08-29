import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardConfig } from './leaderboard-config.entity';
import axios from 'axios';

@Injectable()
export class LeaderboardConfigService {
  constructor(
    @InjectRepository(LeaderboardConfig)
    private readonly leaderboardConfigRepository: Repository<LeaderboardConfig>,
  ) {}

  async validateApiKeyAndStatus(leaderboardId: string, apiKey: string) {
    return this.leaderboardConfigRepository.findOne({
      where: { leaderboardId, apiKey },
    });
  }

  async checkAndCreateLeaderboardConfig(leaderboardId: string, apiKey: string) {
    // const response = await axios.get(`https://jsonplaceholder.typicode.com/todos/1`, {
    //   leaderboardId,
    // }, {
    //   headers: {
    //     'x-developer-api-key': apiKey,
    //   },
    // });
    const response = await axios.get(
      `https://jsonplaceholder.typicode.com/todos/1`,
      {
        headers: {
          'x-developer-api-key': apiKey,
        },
      },
    );

    if (response.data) {
      return this.leaderboardConfigRepository.save({
        leaderboardId,
        apiKey,
        secretKey: 'your-secret-key', // Replace with actual secret key logic
        isActive: true,
      });
    } else {
      throw new Error('Invalid leaderboardId or apiKey');
    }
  }

  async getActiveConfigs() {
    return this.leaderboardConfigRepository.find({ where: { isActive: true } });
  }

  async checkAndUpdateStatus() {
    const configs = await this.leaderboardConfigRepository.find();

    for (const config of configs) {
      const response = await axios.get(
        `https://jsonplaceholder.typicode.com/todos/1`,
        {
          headers: {
            'x-developer-api-key': config.apiKey,
          },
        },
      );

      if (!response.data) {
        config.isActive = false;
        await this.leaderboardConfigRepository.save(config);
      }
    }
  }
}
