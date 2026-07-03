import { Module } from '@nestjs/common';
import { NotificationHttpController } from './notification.http.controller';
import { NotificationService } from '../notification/notification.service';
import { EmailModule } from '../email/email.module';
import { NotificationConsumer } from './notification.consumer';
import { NotificationRedisService } from '../redis/redis.service';
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
import { NotificationGrpcController } from './notification.grpc.controller';

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
