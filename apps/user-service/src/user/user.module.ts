import { Module } from '@nestjs/common';
import { UserGrpcController } from './user.grpc.controller';
import { UserService } from './user.service';
import { UserRedisModule } from '../redis/redis.module';
import { UserPrismaModule } from '../prisma/prisma.module';
import { KAFKA_CLIENT_IDS, KafkaModule } from '@app/kafka';
import { UserHttpController } from './user.http.controller';
import { UserEnrichmentService } from './enrichments/enrichment.service';
import { UserConsumer } from './consumers/user.consumer';
import { E2eeKeysModule } from '../e2ee-keys/e2ee-keys.module';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [
    UserRedisModule,
    UserPrismaModule,
    KafkaModule.register(KAFKA_CLIENT_IDS.USER),
    GrpcClientsModule,
    E2eeKeysModule,
  ],
  controllers: [UserGrpcController, UserHttpController, UserConsumer],
  providers: [UserService, UserEnrichmentService],
})
export class UserModule {}
