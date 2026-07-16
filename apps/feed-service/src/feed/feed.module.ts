import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { PostRedisModule } from 'apps/post-service/src/redis/redis.module';
import { FeedEnrichmentService } from './enrichments/enrichment.service';
import { FeedConsumer } from './consumers/feed.consumer';
import { FeedGrpcController } from './feed.grpc.controller';
import { ClientsModule } from '@app/clients';

@Module({
  imports: [PostRedisModule, ClientsModule],
  providers: [
    FeedService,
    FeedEnrichmentService,
  ],
  controllers: [FeedGrpcController, FeedConsumer],
})
export class FeedModule {}
