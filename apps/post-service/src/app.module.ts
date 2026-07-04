// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PostPrismaModule } from './prisma/prisma.module';
import { PostRedisModule } from './redis/redis.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    PostPrismaModule,
    PostRedisModule,
  ],
})
export class PostAppModule {}
