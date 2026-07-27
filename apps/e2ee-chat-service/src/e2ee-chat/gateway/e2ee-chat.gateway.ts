/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import type { AuthenticatedSocket } from '@app/common';
import { E2eeMessageType, WsAuthGuard } from '@app/common';
import { E2eeChatService } from '../e2ee-chat.service';
import { E2eeChatRedisService } from '../../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/e2ee-chat',
  transports: ['websocket', 'polling'],
})
export class E2eeChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(E2eeChatGateway.name);

  constructor(
    private readonly e2eeChatService: E2eeChatService,
    private readonly redis: E2eeChatRedisService,
    private readonly wsAuthGuard: WsAuthGuard,
  ) {}

  afterInit() {
    this.logger.log('E2EE Chat WebSocket Gateway initialized');

    this.redis.onMessage(({ channel, data }) => {
      this.handleRedisMessage(channel, data);
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      await this.wsAuthGuard.authenticate(client);
    } catch (err) {
      this.logger.warn(
        `Unauthorized connection: ${client.id} — ${err instanceof Error ? err.message : 'unknown'}`,
      );
      client.disconnect();
      return;
    }

    const { userId, deviceId } = client;

    await client.join(`user:${userId}`);
    await client.join(`device:${userId}:${deviceId}`);

    await this.redis.setDeviceOnline(userId, deviceId, client.id);

    const { conversations } = await this.e2eeChatService.getConversations(
      userId,
      1,
      200,
    );

    for (const conv of conversations) {
      await client.join(`conversation:${conv.id}`);
    }

    this.logger.log(`Connected: ${userId}/${deviceId} (${client.id})`);

    client.emit('connection:ready', {
      userId,
      deviceId,
      conversationIds: conversations.map((c: any) => c.id),
    });
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId || !client.deviceId) return;

    await this.redis.setDeviceOffline(client.userId, client.deviceId);

    this.logger.log(
      `Disconnected: ${client.userId}/${client.deviceId} (${client.id})`,
    );
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    await this.redis.setDeviceOnline(client.userId, client.deviceId, client.id);
    client.emit('heartbeat:ack', { timestamp: Date.now() });
  }

  @SubscribeMessage('conversation:start')
  async handleStartConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const result = await this.e2eeChatService.getOrCreateDirectConversation(
      client.userId,
      data.targetUserId,
    );

    if (result.conversation) {
      await client.join(`conversation:${result.conversation.id}`);
    }

    client.emit('conversation:started', result);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.join(`conversation:${data.conversationId}`);

    await this.e2eeChatService.markConversationRead(
      data.conversationId,
      client.userId,
      client.deviceId,
    );

    await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
      type: 'conversation_read',
      userId: client.userId,
      deviceId: client.deviceId,
      conversationId: data.conversationId,
      timestamp: Date.now(),
    });

    client.emit('conversation:joined', {
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      type?: string;
      envelopes: Array<{
        recipientUserId: string;
        recipientDeviceId: string;
        payload: {
          ciphertext: string;
          iv: string;
          authTag: string;
          ratchetHeader?: string;
          ephemeralKey?: string;
          oneTimePreKeyId?: number;
          signedPreKeyId?: number;
        };
      }>;
      attachments?: Array<{
        mediaId: string;
        encryptedKey: string;
        mimeType?: string;
        sizeBytes?: number;
        fileName?: string;
      }>;
      replyToMessageId?: string;
      forwardedFromMessageId?: string;
      clientMessageId?: string;
    },
  ) {
    try {
      const allowed = await this.redis.checkRateLimit(
        `send:${client.userId}:${client.deviceId}`,
        60,
        60,
      );
      if (!allowed) {
        client.emit('message:error', { error: 'Rate limit exceeded' });
        return;
      }

      const result = await this.e2eeChatService.sendEncryptedMessage({
        conversationId: data.conversationId,
        senderId: client.userId,
        senderDeviceId: client.deviceId,
        type: data.type || E2eeMessageType.TEXT,
        envelopes: data.envelopes,
        attachments: data.attachments,
        replyToMessageId: data.replyToMessageId,
        forwardedFromMessageId: data.forwardedFromMessageId,
        clientMessageId: data.clientMessageId,
      });

      await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
        type: 'new_message',
        message: result.encryptedMessage,
        conversationId: data.conversationId,
      });

      for (const envelope of data.envelopes) {
        if (envelope.recipientUserId === client.userId) continue;

        await this.redis.publish(
          `e2ee:device:${envelope.recipientUserId}:${envelope.recipientDeviceId}`,
          {
            type: 'new_envelope',
            conversationId: data.conversationId,
            messageId: result.encryptedMessage?.id,
            envelope,
          },
        );
      }

      await this.redis.clearTyping(
        data.conversationId,
        client.userId,
        client.deviceId,
      );

      client.emit('message:sent', result);
    } catch (err: unknown) {
      client.emit('message:error', {
        error: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('message:ack')
  @SubscribeMessage('receipt:mark')
  async handleReceipt(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      messageId: string;
      status: string;
      conversationId?: string;
    },
  ) {
    const result = await this.e2eeChatService.markReceipt(
      data.messageId,
      client.userId,
      client.deviceId,
      data.status,
    );

    if (data.conversationId) {
      await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
        type: 'receipt_updated',
        messageId: data.messageId,
        userId: client.userId,
        deviceId: client.deviceId,
        status: data.status,
      });
    }

    client.emit('receipt:updated', result);
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.redis.setTyping(
      data.conversationId,
      client.userId,
      client.deviceId,
    );
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.redis.clearTyping(
      data.conversationId,
      client.userId,
      client.deviceId,
    );
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { messageId: string; conversationId: string; forEveryone?: boolean },
  ) {
    await this.e2eeChatService.deleteMessage(
      data.messageId,
      client.userId,
      data.forEveryone,
    );

    await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
      type: 'message_deleted',
      messageId: data.messageId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      messageId: string;
      conversationId: string;
      envelopes: Array<{
        recipientUserId: string;
        recipientDeviceId: string;
        payload: {
          ciphertext: string;
          iv: string;
          authTag: string;
          ratchetHeader?: string;
          ephemeralKey?: string;
          oneTimePreKeyId?: number;
          signedPreKeyId?: number;
        };
      }>;
    },
  ) {
    const result = await this.e2eeChatService.editEncryptedMessage({
      messageId: data.messageId,
      senderId: client.userId,
      senderDeviceId: client.deviceId,
      envelopes: data.envelopes,
    });

    await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
      type: 'message_edited',
      message: result.encryptedMessage,
    });

    for (const envelope of data.envelopes) {
      if (envelope.recipientUserId === client.userId) continue;

      await this.redis.publish(
        `e2ee:device:${envelope.recipientUserId}:${envelope.recipientDeviceId}`,
        {
          type: 'message_edited_envelope',
          conversationId: data.conversationId,
          messageId: data.messageId,
          envelope,
        },
      );
    }
  }

  @SubscribeMessage('message:react')
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { messageId: string; conversationId: string; emoji: string },
  ) {
    const result = await this.e2eeChatService.reactToMessage(
      data.messageId,
      client.userId,
      client.deviceId,
      data.emoji,
    );

    await this.redis.publish(`e2ee:conversation:${data.conversationId}`, {
      type: 'message_reaction',
      messageId: data.messageId,
      userId: client.userId,
      deviceId: client.deviceId,
      emoji: data.emoji,
    });

    client.emit('message:reaction', result);
  }

  private handleRedisMessage(channel: string, data: Record<string, unknown>) {
    if (channel.startsWith('e2ee:conversation:')) {
      const conversationId = channel.replace('e2ee:conversation:', '');
      const room = `conversation:${conversationId}`;
      const type = data.type as string;

      switch (type) {
        case 'new_message':
          this.server.to(room).emit('message:new', data.message);
          break;
        case 'typing_start':
          this.server.to(room).emit('typing:start', {
            userId: data.userId,
            deviceId: data.deviceId,
          });
          break;
        case 'typing_stop':
          this.server.to(room).emit('typing:stop', {
            userId: data.userId,
            deviceId: data.deviceId,
          });
          break;
        case 'conversation_read':
          this.server.to(room).emit('conversation:read', {
            userId: data.userId,
            deviceId: data.deviceId,
            timestamp: data.timestamp,
          });
          break;
        case 'receipt_updated':
          this.server.to(room).emit('receipt:updated', {
            messageId: data.messageId,
            userId: data.userId,
            deviceId: data.deviceId,
            status: data.status,
          });
          break;
        case 'message_reaction':
          this.server.to(room).emit('message:reaction', {
            messageId: data.messageId,
            userId: data.userId,
            deviceId: data.deviceId,
            emoji: data.emoji,
          });
          break;
        case 'message_deleted':
          this.server.to(room).emit('message:deleted', {
            messageId: data.messageId,
          });
          break;
        case 'message_edited':
          this.server.to(room).emit('message:edited', data.message);
          break;
      }
    }

    if (channel.startsWith('e2ee:device:')) {
      const parts = channel.replace('e2ee:device:', '').split(':');
      const userId = parts[0];
      const deviceId = parts.slice(1).join(':');
      const room = `device:${userId}:${deviceId}`;
      const type = data.type as string;

      if (type === 'new_envelope') {
        this.server.to(room).emit('envelope:new', data);
      } else if (type === 'message_edited_envelope') {
        this.server.to(room).emit('envelope:edited', data);
      }
    }

    if (channel === 'e2ee:presence') {
      const type = data.type as string;
      if (type === 'device_online') {
        this.server.emit('presence:online', {
          userId: data.userId,
          deviceId: data.deviceId,
        });
      } else if (type === 'device_offline') {
        this.server.emit('presence:offline', {
          userId: data.userId,
          deviceId: data.deviceId,
          lastSeen: data.lastSeen,
        });
      }
    }
  }
}
