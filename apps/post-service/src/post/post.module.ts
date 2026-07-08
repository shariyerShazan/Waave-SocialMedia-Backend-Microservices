import { Module } from '@nestjs/common';
import { KafkaModule } from '@app/kafka';
import { PostHttpController } from './post.http.controller';
import { PostService } from './post.service';
import { PostRedisModule } from '../redis/redis.module';
import { PostPrismaModule } from '../prisma/prisma.module';
import { PostGrpcController } from './post.grpc.controller';
import { FlushScheduler } from '../scheduler/flush.scheduler';

@Module({
  imports: [
    KafkaModule.register('user-service'),
    PostRedisModule,
    PostPrismaModule,
  ],
  controllers: [PostHttpController, PostGrpcController],
  providers: [PostService, FlushScheduler],
})
export class PostModule {}
