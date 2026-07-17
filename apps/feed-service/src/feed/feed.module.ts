import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
// import { PostRedisModule } from 'apps/post-service/src/redis/redis.module';
import { FeedEnrichmentService } from './enrichments/enrichment.service';
import { FeedConsumer } from './consumers/feed.consumer';
import { FeedGrpcController } from './feed.grpc.controller';
import { ClientsModule } from '@app/clients';
import { FeedRedisService } from '../redis/redis.service';

@Module({
  imports: [ClientsModule],
  providers: [FeedService, FeedEnrichmentService, FeedRedisService],
  controllers: [FeedGrpcController, FeedConsumer],
})
export class FeedModule {}
