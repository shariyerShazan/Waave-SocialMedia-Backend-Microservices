import { Module } from '@nestjs/common';
import { UserGrpcController } from './user.grpc.controller';
import { UserService } from './user.service';
import { UserRedisModule } from '../redis/redis.module';
import { UserPrismaModule } from '../prisma/prisma.module';
import { UserConsumer } from './user.consumer';
import { KafkaModule } from '@app/kafka';
import { UserHttpController } from './user.http.controller';

@Module({
  imports: [
    UserRedisModule,
    UserPrismaModule,
    KafkaModule.register('user-service'),
  ],
  controllers: [UserGrpcController, UserHttpController, UserConsumer],
  providers: [UserService],
})
export class UserModule {}
