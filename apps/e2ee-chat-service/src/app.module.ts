import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { E2eeChatPrismaModule } from './prisma/prisma.module';
import { E2eeChatRedisModule } from './redis/redis.module';
import { E2eeChatModule } from './e2ee-chat/e2ee-chat.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    E2eeChatPrismaModule,
    E2eeChatRedisModule,
    E2eeChatModule,
  ],
})
export class E2eeChatAppModule {}
