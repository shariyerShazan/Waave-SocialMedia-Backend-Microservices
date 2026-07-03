import { Module } from '@nestjs/common';
import { NotificationHttpController } from './notification.http.controller';
import { NotificationService } from '../notification/notification.service';
import { EmailModule } from '../email/email.module';
import { NotificationConsumer } from './notification.consumer';
import { NotificationRedisService } from '../redis/redis.service';
// import { FcmService } from '../fcm/fcm.service';
import { NotificationGateway } from './notification.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from '../schemas/notification.schema';

import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from '../schemas/notification-preference.schema';

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
  controllers: [NotificationHttpController, NotificationConsumer],
  providers: [
    NotificationService,
    NotificationRedisService,
    // FcmService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
