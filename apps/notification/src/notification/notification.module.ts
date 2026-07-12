import { Module } from '@nestjs/common';
import { NotificationHttpController } from './notification.http.controller';
import { NotificationService } from '../notification/notification.service';
import { EmailModule } from '../email/email.module';
import { NotificationRedisService } from '../redis/redis.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from '../schemas/notification.schema';

import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from '../schemas/notification-preference.schema';
import { NotificationGrpcController } from './notification.grpc.controller';
import { NotificationConsumer } from './consumers/notification.consumer';
import { NotificationGateway } from './gateway/notification.gateway';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
    ]),
  ],
  controllers: [
    NotificationHttpController,
    NotificationConsumer,
    NotificationGrpcController,
  ],
  providers: [
    NotificationService,
    NotificationRedisService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
