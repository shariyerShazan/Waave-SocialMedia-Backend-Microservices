/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ChatRedisService } from '../../redis/redis.service';

interface AuthSocket extends Socket {
  userId: string;
  userName: string;
  avatar: string;
}

@WebSocketGateway({
  port: 3001,
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private redis: ChatRedisService,
  ) {}

  afterInit() {
    this.logger.log('✅ Chat WebSocket Gateway initialized');

    // Redis Pub/Sub → Socket.IO bridge
    this.redis.onMessage(async ({ channel, data }) => {
      await this.handleRedisMessage(channel, data);
    });
  }

  // ── Connection ────────────────────────────────
  async handleConnection(client: AuthSocket) {
    const userId =
      client.handshake.auth?.userId ||
      (client.handshake.query?.userId as string);
    const userName = client.handshake.auth?.userName || 'Anonymous';
    const avatar = client.handshake.auth?.avatar || '';

    if (!userId) {
      this.logger.warn(`Unauthorized connection: ${client.id}`);
      client.disconnect();
      return;
    }

    client.userId = userId;
    client.userName = userName;
    client.avatar = avatar;

    // Room join — personal room
    await client.join(`user:${userId}`);

    // Online status set
    await this.redis.setUserOnline(userId, client.id);

    const { conversations } = await this.chatService.getConversations(
      userId,
      1,
      100,
    );
    for (const conv of conversations) {
      await client.join(`conversation:${conv.id}`);
    }

    this.logger.log(`✅ Connected: ${userId} (${client.id})`);

    // Online status broadcast
    client.broadcast.emit('user:online', {
      userId,
      userName,
      avatar,
    });
  }

  // ── Disconnection ─────────────────────────────
  async handleDisconnect(client: AuthSocket) {
    if (!client.userId) return;

    await this.redis.setUserOffline(client.userId);

    this.logger.log(`❌ Disconnected: ${client.userId} (${client.id})`);

    // Offline broadcast
    this.server.emit('user:offline', {
      userId: client.userId,
      lastSeen: Date.now(),
    });
  }

  // ── Send Message ──────────────────────────────
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      conversationId: string;
      text: string;
      mediaIds?: string[];
      type?: string;
      replyTo?: string;
    },
  ) {
    try {
      const message = await this.chatService.sendMessage({
        conversationId: data.conversationId,
        senderId: client.userId,
        senderName: client.userName,
        senderAvatar: client.avatar,
        text: data.text,
        mediaIds: data.mediaIds,
        type: data.type,
        replyTo: data.replyTo,
      });

      const messageData = {
        id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        text: message.text,
        mediaIds: message.mediaIds,
        type: message.type,
        replyTo: message.replyTo,
        readBy: message.readBy,
        reactions: message.reactions,
        createdAt: message.createdAt,
      };

      await this.redis.publish(`chat:conversation:${data.conversationId}`, {
        type: 'new_message',
        message: messageData,
      });

      // Typing stop
      await this.redis.clearTyping(data.conversationId, client.userId);
      client.emit('message:sent', { success: true, message: messageData });
    } catch (err: any) {
      client.emit('message:error', { error: err.message });
    }
  }

  // ── Start Conversation ────────────────────────
  @SubscribeMessage('conversation:start')
  async handleStartConversation(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const conversation = await this.chatService.getOrCreateConversation(
      client.userId,
      data.targetUserId,
    );

    // Room join
    await client.join(`conversation:${conversation._id}`);

    client.emit('conversation:started', {
      conversationId: conversation._id,
      conversation,
    });
  }

  // ── Join Conversation Room ────────────────────
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.join(`conversation:${data.conversationId}`);

    // Mark as read
    await this.chatService.markAsRead(data.conversationId, client.userId);

    // Read receipt broadcast
    await this.redis.publish(`chat:conversation:${data.conversationId}`, {
      type: 'messages_read',
      userId: client.userId,
      conversationId: data.conversationId,
      timestamp: Date.now(),
    });

    client.emit('conversation:joined', {
      conversationId: data.conversationId,
    });
  }

  // ── Typing ────────────────────────────────────
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.redis.setTyping(
      data.conversationId,
      client.userId,
      client.userName,
    );
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.redis.clearTyping(data.conversationId, client.userId);
  }

  // ── Message Reaction ──────────────────────────
  @SubscribeMessage('message:react')
  async handleReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      messageId: string;
      conversationId: string;
      emoji: string;
    },
  ) {
    const updated = await this.chatService.reactToMessage(
      data.messageId,
      client.userId,
      data.emoji,
    );

    await this.redis.publish(`chat:conversation:${data.conversationId}`, {
      type: 'message_reaction',
      messageId: data.messageId,
      userId: client.userId,
      emoji: data.emoji,
      reactions: updated.reactions,
    });
  }

  // ── Delete Message ────────────────────────────
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      messageId: string;
      conversationId: string;
    },
  ) {
    await this.chatService.deleteMessage(data.messageId, client.userId);

    await this.redis.publish(`chat:conversation:${data.conversationId}`, {
      type: 'message_deleted',
      messageId: data.messageId,
      userId: client.userId,
    });
  }

  // ── Redis → Socket Bridge ─────────────────────
  private handleRedisMessage(channel: string, data: any) {
    // conversation channel
    if (channel.startsWith('chat:conversation:')) {
      const conversationId = channel.replace('chat:conversation:', '');
      const room = `conversation:${conversationId}`;

      switch (data.type) {
        case 'new_message':
          this.server.to(room).emit('message:new', data.message);
          break;

        case 'typing_start':
          this.server.to(room).emit('typing:start', {
            userId: data.userId,
            userName: data.userName,
          });
          break;

        case 'typing_stop':
          this.server.to(room).emit('typing:stop', {
            userId: data.userId,
          });
          break;

        case 'messages_read':
          this.server.to(room).emit('messages:read', {
            userId: data.userId,
            timestamp: data.timestamp,
          });
          break;

        case 'message_reaction':
          this.server.to(room).emit('message:reaction', {
            messageId: data.messageId,
            emoji: data.emoji,
            userId: data.userId,
            reactions: data.reactions,
          });
          break;

        case 'message_deleted':
          this.server.to(room).emit('message:deleted', {
            messageId: data.messageId,
          });
          break;
      }
    }

    // Presence channel
    if (channel === 'chat:presence') {
      if (data.type === 'online') {
        this.server.emit('user:online', {
          userId: data.userId,
          socketId: data.socketId,
        });
      } else if (data.type === 'offline') {
        this.server.emit('user:offline', {
          userId: data.userId,
          lastSeen: data.lastSeen,
        });
      }
    }
  }
}
