import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { MediaGrpcClient } from './clients/media-grpc.clinet';
import { PostGrpcClient } from './clients/post-grpc.client';
import { UserGrpcClient } from './clients/user-grpc.client';

@Module({
  providers: [ClientsService, MediaGrpcClient, PostGrpcClient, UserGrpcClient],
  exports: [ClientsService, MediaGrpcClient, PostGrpcClient, UserGrpcClient],
})
export class ClientsModule {}
