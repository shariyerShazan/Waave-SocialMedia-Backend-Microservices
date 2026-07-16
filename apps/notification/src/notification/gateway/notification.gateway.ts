/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
// gateway/notification.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationRedisService } from '../../redis/redis.service';
import { NotificationService } from '../notification.service';

interface AuthSocket extends Socket {
  userId: string;
}

@WebSocketGateway({
  port: 3003,
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private redis: NotificationRedisService,
    private notifService: NotificationService,
  ) {}

  afterInit() {
    this.logger.log('Notification Gateway initialized');

    this.redis.onPushNotification(async ({ userId, notification }) => {
      this.server.to(`user:${userId}`).emit('notification:new', notification);

      this.logger.debug(`Pushed notification to user:${userId}`);
    });
  }

  async handleConnection(client: AuthSocket) {
    const userId = client.handshake.auth?.userId as string;

    if (!userId) {
      client.disconnect();
      return;
    }

    client.userId = userId;

    await client.join(`user:${userId}`);

    await this.redis.setUserSocket(userId, client.id);

    const unreadCount = await this.notifService['redis'].getUnreadCount(userId);

    client.emit('notification:unread_count', { unreadCount });

    this.logger.log(`Notification connected: ${userId} (${client.id})`);
  }

  async handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      await this.redis.removeUserSocket(client.userId);
      this.logger.log(`Notification disconnected: ${client.userId}`);
    }
  }

  // ── Mark as Read ──────────────────────────────
  @SubscribeMessage('notification:read')
  async handleRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    await this.notifService.markAsRead(client.userId, data.notificationId);

    const unreadCount = await this.redis.getUnreadCount(client.userId);
    client.emit('notification:unread_count', { unreadCount });
  }

  // ── Mark All as Read ──────────────────────────
  @SubscribeMessage('notification:read_all')
  async handleReadAll(@ConnectedSocket() client: AuthSocket) {
    await this.notifService.markAllAsRead(client.userId);
    client.emit('notification:unread_count', { unreadCount: 0 });
  }
}
