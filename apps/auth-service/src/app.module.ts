// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { AuthRedisModule } from './redis/redis.module';
import { AuthPrismaModule } from './prisma/prisma.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [
    AuthModule,
    AuthRedisModule,
    AuthPrismaModule,
    TokenModule,
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AuthAppModule {}
