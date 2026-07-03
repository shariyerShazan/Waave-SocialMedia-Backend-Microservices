/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import type { NotificationGrpcServiceClient } from '@app/proto-schema/protos-types/notification';

@Injectable()
export class NotificationClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'notification',
      protoPath: join(
        process.cwd(),
        'libs/proto-schema/src/proto/notification.proto',
      ),
      url: process.env.NOTIFICATION_GRPC_URL || 'localhost:3010',
    },
  })
  private client: ClientGrpc;

  private notificationService: NotificationGrpcServiceClient;

  onModuleInit() {
    this.notificationService =
      this.client.getService<NotificationGrpcServiceClient>(
        'NotificationGrpcService',
      );
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message: err?.details ?? err?.message ?? 'Something went wrong',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async getNotifications(userId: string, page: number, limit: number) {
    try {
      return await firstValueFrom(
        this.notificationService.getNotifications({
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    try {
      return await firstValueFrom(
        this.notificationService.markAsRead({
          userId,
          notificationId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      return await firstValueFrom(
        this.notificationService.markAllAsRead({
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteNotification(userId: string, notificationId: string) {
    try {
      return await firstValueFrom(
        this.notificationService.deleteNotification({
          userId,
          notificationId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getPreferences(userId: string) {
    try {
      return await firstValueFrom(
        this.notificationService.getPreferences({
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async updatePreferences(
    userId: string,
    dto: {
      likes?: boolean;
      comments?: boolean;
      follows?: boolean;
      unfollows?: boolean;
      mentions?: boolean;
      messages?: boolean;
    },
  ) {
    try {
      return await firstValueFrom(
        this.notificationService.updatePreferences({
          userId,
          likes: dto.likes ?? false,
          comments: dto.comments ?? false,
          follows: dto.follows ?? false,
          unfollows: dto.unfollows ?? false,
          mentions: dto.mentions ?? false,
          messages: dto.messages ?? false,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
