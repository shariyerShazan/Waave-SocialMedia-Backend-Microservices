import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import type {
  DeleteNotificationRequest,
  GetNotificationsRequest,
  GetPreferencesRequest,
  MarkAllAsReadRequest,
  MarkAsReadRequest,
  UpdatePreferencesRequest,
} from '@app/proto-schema/protos-types/notification';

@Controller()
export class NotificationGrpcController {
  constructor(private readonly notificationService: NotificationService) {}

  @GrpcMethod('NotificationGrpcService', 'GetNotifications')
  getNotifications(data: GetNotificationsRequest) {
    return this.notificationService.getNotifications(
      data.userId,
      data.page,
      data.limit,
    );
  }

  @GrpcMethod('NotificationGrpcService', 'MarkAsRead')
  markAsRead(data: MarkAsReadRequest) {
    return this.notificationService.markAsRead(
      data.userId,
      data.notificationId,
    );
  }

  @GrpcMethod('NotificationGrpcService', 'MarkAllAsRead')
  markAllAsRead(data: MarkAllAsReadRequest) {
    return this.notificationService.markAllAsRead(data.userId);
  }

  @GrpcMethod('NotificationGrpcService', 'DeleteNotification')
  deleteNotification(data: DeleteNotificationRequest) {
    return this.notificationService.deleteNotification(
      data.userId,
      data.notificationId,
    );
  }

  @GrpcMethod('NotificationGrpcService', 'GetPreferences')
  getPreferences(data: GetPreferencesRequest) {
    return this.notificationService.getPreferences(data.userId);
  }

  @GrpcMethod('NotificationGrpcService', 'UpdatePreferences')
  updatePreferences(data: UpdatePreferencesRequest) {
    return this.notificationService.updatePreferences(data.userId, data);
  }
}
