import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { RateLimiterModule } from './rateLimit/rateLimit.module';
import { MediaModule } from './media/media.module';
import { SharedEnrichmentModule } from './shared/shared-enrichment.module';
import { NotificationModule } from './notification/notification.module';

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
    SharedEnrichmentModule,
    NotificationModule,
  ],
})
export class AppModule {}
