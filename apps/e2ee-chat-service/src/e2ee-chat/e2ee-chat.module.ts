import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsAuthGuard } from '@app/common';
import { E2eeChatPrismaModule } from '../prisma/prisma.module';
import { E2eeChatRedisModule } from '../redis/redis.module';
import { E2eeChatService } from './e2ee-chat.service';
import { E2eeChatGrpcController } from './e2ee-chat.grpc.controller';
import { E2eeChatHttpController } from './e2ee-chat.http.controller';
import { E2eeChatGateway } from './gateway/e2ee-chat.gateway';
import { E2eeChatEnrichmentService } from './enrichments/enrichment.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [
    E2eeChatPrismaModule,
    E2eeChatRedisModule,
    JwtModule,
    GrpcClientsModule,
  ],
  providers: [
    E2eeChatService,
    E2eeChatEnrichmentService,
    WsAuthGuard,
    E2eeChatGateway,
  ],
  controllers: [E2eeChatGrpcController, E2eeChatHttpController],
  exports: [E2eeChatService],
})
export class E2eeChatModule {}
