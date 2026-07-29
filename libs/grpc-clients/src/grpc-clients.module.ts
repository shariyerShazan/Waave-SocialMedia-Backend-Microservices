import { Module } from '@nestjs/common';
import { ClientsService } from './grpc-clients.service';
import { MediaGrpcClient } from './clients/media-grpc.clinet';
import { PostGrpcClient } from './clients/post-grpc.client';
import { UserGrpcClient } from './clients/user-grpc.client';
import { AuthGrpcClient } from './clients/auth-grpc.client';
import { FeedGrpcClient } from './clients/feed-grpc.client';
import { ChatGrpcClient } from './clients/chat-grpc.client';
import { NotificationGrpcClient } from './clients/notification-grpc.client';
import { McpGrpcClient } from './clients/mcp-grpc.client';
import { E2eeChatGrpcClient } from './clients/e2ee-chat-grpc.client';

@Module({
  providers: [
    ClientsService,
    AuthGrpcClient,
    MediaGrpcClient,
    PostGrpcClient,
    UserGrpcClient,
    FeedGrpcClient,
    ChatGrpcClient,
    E2eeChatGrpcClient,
    NotificationGrpcClient,
    McpGrpcClient,
  ],
  exports: [
    ClientsService,
    AuthGrpcClient,
    MediaGrpcClient,
    PostGrpcClient,
    UserGrpcClient,
    FeedGrpcClient,
    ChatGrpcClient,
    E2eeChatGrpcClient,
    NotificationGrpcClient,
    McpGrpcClient,
  ],
})
export class GrpcClientsModule {}
