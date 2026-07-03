// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// import { Controller } from '@nestjs/common';
// import { GrpcMethod } from '@nestjs/microservices';
// import { NotificationService } from './notification.service';
// import type {
//   GetNotificationByIdRequest,
//   GetNotificationsRequest,
//   MarkAllAsReadRequest,
//   MarkAsReadRequest,
// } from '@app/proto-schema/protos-types/notification';

// @Controller()
// export class NotificationGrpcController {
//   constructor(private readonly notificationService: NotificationService) {}

//   @GrpcMethod('NotificationGrpcService', 'GetNotifications')
//   getNotifications(data: GetNotificationsRequest) {
//     return this.notificationService.getNotifications(
//       data.userId,
//       data.page,
//       data.limit,
//     );
//   }

//   @GrpcMethod('NotificationGrpcService', 'GetNotificationById')
//   getNotificationById(data: GetNotificationByIdRequest) {
//     return this.notificationService.getNotificationById(
//       data.userId,
//       data.notificationId,
//     );
//   }

//   @GrpcMethod('NotificationGrpcService', 'MarkAsRead')
//   async markAsRead(data: MarkAsReadRequest) {
//     await this.notificationService.markAsRead(data.userId, data.notificationId);
//     return { success: true };
//   }

//   @GrpcMethod('NotificationGrpcService', 'MarkAllAsRead')
//   async markAllAsRead(data: MarkAllAsReadRequest) {
//     await this.notificationService.markAllAsRead(data.userId);
//     return { success: true };
//   }
// }
