// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { FeedRedisModule } from './redis/redis.module';
import { FeedModule } from './feed/feed.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    FeedRedisModule,
    FeedModule,
  ],
})
export class FeedAppModule {}
