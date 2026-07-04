import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaModule } from './media/media.module';
import { ProcessingModule } from './processing/processing.module';
import { StorageModule } from './storage/storage.module';
import { MediaRedisModule } from './redis/redis.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MEDIA_MONGO_DB_URL!,
      }),
    }),
    MediaModule,
    ProcessingModule,
    StorageModule,
    MediaRedisModule,
  ],
})
export class MediaAppModule {}
