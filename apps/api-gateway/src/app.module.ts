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

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    RateLimiterModule,
    MediaModule,
    NotificationModule,
    PostModule,
    FeedModule,
    ChatModule,
  ],
})
export class GatewayAppModule {}
