// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PostPrismaModule } from './prisma/prisma.module';
import { PostRedisModule } from './redis/redis.module';
import { PostModule } from './post/post.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PostPrismaModule,
    PostRedisModule,
    PostModule,
  ],
})
export class PostAppModule {}
