/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { join } from 'path';
import {
  CHAT_SERVICE_NAME,
  ChatServiceClient,
} from '@app/proto-schema/protos-types/chat';

@Injectable()
export class ChatClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'chat',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/chat.proto'),
      url: process.env.CHAT_SERVICE_GRPC_URL || 'localhost:3005',
    },
  })
  private client: ClientGrpc;

  private chatService: ChatServiceClient;

  onModuleInit() {
    this.chatService =
      this.client.getService<ChatServiceClient>(CHAT_SERVICE_NAME);
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message: err?.message ?? err?.details ?? 'Chat service unavailable',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async getOrCreateConversation(userId1: string, userId2: string) {
    try {
      return await firstValueFrom(
        this.chatService.getOrCreateConversation({
          userId1,
          userId2,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async createGroup(data: {
    name: string;
    creatorId: string;
    participantIds: string[];
    avatar?: string;
  }) {
    try {
      return await firstValueFrom(
        this.chatService.createGroup({
          name: data.name,
          creatorId: data.creatorId,
          participantIds: data.participantIds,
          avatar: data.avatar ?? '',
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async addGroupMember(
    conversationId: string,
    adminId: string,
    userId: string,
  ) {
    try {
      return await firstValueFrom(
        this.chatService.addGroupMember({
          conversationId,
          adminId,
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    mediaIds?: string[];
    type?: string;
    replyTo?: string;
  }) {
    try {
      return await firstValueFrom(
        this.chatService.sendMessage({
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar ?? '',
          text: data.text,
          mediaIds: data.mediaIds ?? [],
          type: data.type ?? 'text',
          replyTo: data.replyTo ?? '',
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
  ) {
    try {
      return await firstValueFrom(
        this.chatService.getMessages({
          conversationId,
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.chatService.deleteMessage({
          messageId,
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async markAsRead(conversationId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.chatService.markAsRead({
          conversationId,
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async reactToMessage(messageId: string, userId: string, emoji: string) {
    try {
      return await firstValueFrom(
        this.chatService.reactToMessage({
          messageId,
          userId,
          emoji,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getConversations(userId: string, page: number, limit: number) {
    try {
      return await firstValueFrom(
        this.chatService.getConversations({
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
