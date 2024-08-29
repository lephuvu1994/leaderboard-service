import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardConfigService } from './leaderboard-config.service';
import * as crypto from 'crypto';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Redis } from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private readonly leaderboardRepository: Repository<Leaderboard>,
    private readonly leaderboardConfigService: LeaderboardConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    axiosRetry(axios, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status >= 500
        );
      },
    });
  }

  private decrypt(text: string, secretKey: string): string {
    const encryptedBuffer = Buffer.from(text, 'base64');
    // Lấy IV từ 16 byte đầu tiên của buffer
    const iv = encryptedBuffer.slice(0, 16);
    const encryptedText = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(secretKey, 'utf8'),
      iv,
    );
    let decrypted = decipher.update(encryptedText.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async addScore(encryptedData: string, leaderboardId: string, apiKey: string) {
    let leaderboardConfig =
      await this.leaderboardConfigService.validateApiKeyAndStatus(
        leaderboardId,
        apiKey,
      );

    if (leaderboardConfig) {
      if (leaderboardConfig.isActive === false) {
        throw new UnauthorizedException('LeaderboardId is inactive');
      }
    } else {
      leaderboardConfig =
        await this.leaderboardConfigService.checkAndCreateLeaderboardConfig(
          leaderboardId,
          apiKey,
        );
    }

    const decryptedData = this.decrypt(encryptedData, apiKey.substring(0, 32));
    const realRequestData = JSON.parse(decryptedData);

    // Cache the score data
    const addRedisData = await this.redis.set(leaderboardId, JSON.stringify(realRequestData.items));
    console.log("addRedisData", addRedisData);
    const newScore = this.leaderboardRepository.create({
      leaderboardId,
      userId: realRequestData.items[0].userId,
      score: realRequestData.items[0].score,
    });

    const newRecord = await this.leaderboardRepository.save(newScore);
    console.log("newRecord", newRecord);

    // Save leaderboardId to Redis if not exists
    await this.redis.sadd('leaderboard_ids', leaderboardId);

    return { status: 'Score saved successfully' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    const leaderboardConfigs =
      await this.leaderboardConfigService.getActiveConfigs();

    for (const config of leaderboardConfigs) {
      const scores = await this.leaderboardRepository.find({
        where: { leaderboardId: config.leaderboardId },
      });

      if (scores.length > 0) {
        await this.leaderboardRepository
          .createQueryBuilder()
          .insert()
          .into(Leaderboard)
          .values(scores)
          .execute();
      }
    }
  }

  @Cron('59 23 * * *')
  async updateStatuses() {
    await this.leaderboardConfigService.checkAndUpdateStatus();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processAllLeaderboardsAndSend() {
    const leaderboardIds = await this.redis.smembers('leaderboard_ids');

    for (const leaderboardId of leaderboardIds) {
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const scores = await this.leaderboardRepository.find({
          where: { leaderboardId },
          skip: offset,
          take: batchSize,
        });

        if (scores.length === 0) break;

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount <= maxRetries) {
          try {
            const url = `https://external-service.com/api/submit-scores`;
            const headers = { 'x-developer-api-key': 'your-api-key' }; // Update as necessary

            await axios.post(
              url,
              {
                leaderboardId,
                scores: scores.map((score) => ({
                  userId: score.userId,
                  score: score.score,
                })),
              },
              { headers },
            );

            // Xóa dữ liệu đã gửi thành công từ cơ sở dữ liệu
            await this.leaderboardRepository.delete({
              leaderboardId,
              id: In(scores.map((score) => score.id)),
            });

            // Xóa leaderboardId khỏi Redis nếu gửi thành công
            await this.redis.srem('leaderboard_ids', leaderboardId);

            break; // Thành công, thoát khỏi vòng lặp retry
          } catch (error) {
            console.error(
              `Failed to send scores for leaderboardId ${leaderboardId}. Attempt ${retryCount + 1}`,
            );
            retryCount++;
            if (retryCount > maxRetries) {
              console.error(
                `Failed to send scores for leaderboardId ${leaderboardId} after ${maxRetries} attempts`,
              );
              await this.redis.sadd('retry_queue', leaderboardId); // Đưa vào hàng đợi retry nếu cần
            }
          }
        }

        offset += batchSize;
      }
    }
  }
}

// import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, In } from 'typeorm';
// import { Leaderboard } from './leaderboard.entity';
// import { LeaderboardConfigService } from './leaderboard-config.service';
// import axios from 'axios';
// import axiosRetry from 'axios-retry';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { ClientProxy } from '@nestjs/microservices';

// @Injectable()
// export class LeaderboardService {
//   constructor(
//     @InjectRepository(Leaderboard)
//     private readonly leaderboardRepository: Repository<Leaderboard>,
//     private readonly leaderboardConfigService: LeaderboardConfigService,
//     @Inject('RABBITMQ_SERVICE') private readonly rabbitMqClient: ClientProxy,
//   ) {
//     axiosRetry(axios, {
//       retries: 3,
//       retryDelay: axiosRetry.exponentialDelay,
//       retryCondition: (error) => {
//         return (
//           axiosRetry.isNetworkOrIdempotentRequestError(error) ||
//           error.response?.status >= 500
//         );
//       },
//     });
//   }

//   async addScore(decryptedData: string, leaderboardId: string, apiKey: string) {
//     let leaderboardConfig =
//       await this.leaderboardConfigService.validateApiKeyAndStatus(
//         leaderboardId,
//         apiKey,
//       );

//     if (leaderboardConfig) {
//       if (leaderboardConfig.isActive === false) {
//         throw new UnauthorizedException('LeaderboardId is inactive');
//       }
//     } else {
//       leaderboardConfig =
//         await this.leaderboardConfigService.checkAndCreateLeaderboardConfig(
//           leaderboardId,
//           apiKey,
//         );
//     }
//     const realRequestData = JSON.parse(decryptedData);

//     // Gửi dữ liệu đến RabbitMQ
//     await this.rabbitMqClient.emit('add_score_event', { leaderboardId, realRequestData, apiKey }).toPromise();
//     console.log("realRequestData", realRequestData);

//     // const newScore = this.leaderboardRepository.create({
//     //   leaderboardId,
//     //   userId: realRequestData.items[0].userId,
//     //   score: realRequestData.items[0].score,
//     // });

//     // const newRecord = await this.leaderboardRepository.save(newScore);
//     // console.log("newRecord", newRecord);

//     // Save leaderboardId to Redis if not exists chỗ này cần nghiên cứu thêm lại
//     // await this.redis.sadd('leaderboard_ids', leaderboardId);

//     return { status: 'Score saved successfully' };
//   }

//   @Cron('59 23 * * *')
//   async updateStatuses() {
//     await this.leaderboardConfigService.checkAndUpdateStatus();
//   }

//   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//   async processAllLeaderboardsAndSend() {
//     const leaderboardIds = await this.redis.smembers('leaderboard_ids');

//     for (const leaderboardId of leaderboardIds) {
//       let offset = 0;
//       const batchSize = 100;

//       while (true) {
//         const scores = await this.leaderboardRepository.find({
//           where: { leaderboardId },
//           skip: offset,
//           take: batchSize,
//         });

//         if (scores.length === 0) break;

//         let retryCount = 0;
//         const maxRetries = 3;

//         while (retryCount <= maxRetries) {
//           try {
//             const url = `https://external-service.com/api/submit-scores`;
//             const headers = { 'x-developer-api-key': 'your-api-key' }; // Update as necessary

//             await axios.post(
//               url,
//               {
//                 leaderboardId,
//                 scores: scores.map((score) => ({
//                   userId: score.userId,
//                   score: score.score,
//                 })),
//               },
//               { headers },
//             );

//             // Xóa dữ liệu đã gửi thành công từ cơ sở dữ liệu
//             await this.leaderboardRepository.delete({
//               leaderboardId,
//               id: In(scores.map((score) => score.id)),
//             });

//             // Xóa leaderboardId khỏi Redis nếu gửi thành công
//             await this.redis.srem('leaderboard_ids', leaderboardId);

//             break; // Thành công, thoát khỏi vòng lặp retry
//           } catch (error) {
//             console.error(
//               `Failed to send scores for leaderboardId ${leaderboardId}. Attempt ${retryCount + 1}`,
//             );
//             retryCount++;
//             if (retryCount > maxRetries) {
//               console.error(
//                 `Failed to send scores for leaderboardId ${leaderboardId} after ${maxRetries} attempts`,
//               );
//               await this.redis.sadd('retry_queue', leaderboardId); // Đưa vào hàng đợi retry nếu cần
//             }
//           }
//         }

//         offset += batchSize;
//       }
//     }
//   }
// }
