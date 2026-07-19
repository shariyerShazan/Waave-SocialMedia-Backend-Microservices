import { Module } from '@nestjs/common';
import { KAFKA_CLIENT_IDS, KafkaModule } from '@app/kafka';
import { ClientsModule } from '@app/clients';
import { PostHttpController } from './post.http.controller';
import { PostService } from './post.service';
import { PostRedisModule } from '../redis/redis.module';
import { PostPrismaModule } from '../prisma/prisma.module';
import { PostGrpcController } from './post.grpc.controller';
import { FlushScheduler } from '../scheduler/flush.scheduler';
import { PostEnrichmentService } from './enrichments/enrichment.service';

@Module({
  imports: [
    KafkaModule.register(KAFKA_CLIENT_IDS.POST),
    PostRedisModule,
    PostPrismaModule,
    ClientsModule,
  ],
  controllers: [PostHttpController, PostGrpcController],
  providers: [PostService, FlushScheduler, PostEnrichmentService],
})
export class PostModule {}
