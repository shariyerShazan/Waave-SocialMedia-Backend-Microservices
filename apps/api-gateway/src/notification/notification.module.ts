import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationClient } from './notification.client';

@Module({
  controllers: [NotificationController],
  exports: [NotificationClient],
  providers: [NotificationClient],
})
export class NotificationModule {}
