// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { UserGrpcClient } from './clients/user-grpc.client';
import { PostGrpcClient } from './clients/post-grpc.client';
import { FeedService } from './feed.service';
import { PostRedisModule } from 'apps/post-service/src/redis/redis.module';
import { FeedEnrichmentService } from './enrichments/enrichment.service';
import { FeedConsumer } from './consumers/feed.consumer';
import { FeedGrpcController } from './feed.grpc.controller';

@Module({
  imports: [PostRedisModule],
  providers: [
    UserGrpcClient,
    PostGrpcClient,
    FeedService,
    FeedEnrichmentService,
  ],
  controllers: [FeedGrpcController, FeedConsumer],
})
export class FeedModule {}
