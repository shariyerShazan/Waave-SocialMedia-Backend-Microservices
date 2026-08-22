import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { RateLimiterModule } from './rateLimit/rateLimit.module';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { PostModule } from './post/post.module';
import { FeedModule } from './feed/feed.module';
import { ChatModule } from './chat/chat.module';
import { E2eeChatModule } from './e2ee-chat/e2ee-chat.module';
import { McpGatewayModule } from './mcp/mcp.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    RateLimiterModule,
    MediaModule,
    NotificationModule,
    PostModule,
    FeedModule,
    ChatModule,
    E2eeChatModule,
    McpGatewayModule,
  ],
})
export class GatewayAppModule {}
