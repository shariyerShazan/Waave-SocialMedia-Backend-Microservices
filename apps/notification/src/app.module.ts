import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { NotificationModule } from './notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationRedisModule } from './redis/redis.module';
@Module({
  imports: [
    EmailModule,
    NotificationModule,
    NotificationRedisModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.NOTIFICATION_MONGO_DB_URL!,
      }),
    }),
  ],
})
export class AppModule {}
