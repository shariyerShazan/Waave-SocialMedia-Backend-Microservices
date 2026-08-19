/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  CHAT_SERVICE_NAME,
  ChatServiceClient,
  type AddGroupMemberRequest,
  type ArchiveConversationRequest,
  type CreateGroupRequest,
  type DeleteMessageRequest,
  type EditMessageRequest,
  type ForwardMessageRequest,
  type GetConversationRequest,
  type GetConversationsRequest,
  type GetGroupMembersForNotifRequest,
  type GetGroupMembersForNotifResponse,
  type GetMessagesRequest,
  type GetOrCreateConversationRequest,
  type GetUnreadCountsRequest,
  type LeaveGroupRequest,
  type MarkAsReadRequest,
  type MarkReceiptRequest,
  type MuteConversationRequest,
  type PinConversationRequest,
  type PinMessageRequest,
  type ReactToMessageRequest,
  type RemoveGroupMemberRequest,
  type SendMessageRequest,
  type UpdateMemberRoleRequest,
} from '@app/proto-schema/protos-types/chat';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatGrpcClient implements OnModuleInit {
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

  async getOrCreateConversation(
    data: GetOrCreateConversationRequest | { userId1: string; userId2: string },
  ) {
    try {
      const payload =
        'userId1' in data
          ? data
          : { userId1: (data as any).userId, userId2: (data as any).targetUserId };
      return await firstValueFrom(
        this.chatService.getOrCreateConversation(payload),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async createGroup(data: CreateGroupRequest) {
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

  async getConversations(
    data: GetConversationsRequest | { userId: string; page?: number; limit?: number; archived?: boolean },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.getConversations({
          userId: data.userId,
          page: data.page ?? 1,
          limit: data.limit ?? 20,
          archived: data.archived,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getConversation(data: GetConversationRequest) {
    try {
      return await firstValueFrom(this.chatService.getConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async addGroupMember(
    data: AddGroupMemberRequest | { conversationId: string; adminId: string; userId: string; role?: string },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.addGroupMember({
          conversationId: data.conversationId,
          adminId: data.adminId,
          userId: data.userId,
          role: data.role ?? 'MEMBER',
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async removeGroupMember(data: RemoveGroupMemberRequest) {
    try {
      return await firstValueFrom(this.chatService.removeGroupMember(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async leaveGroup(data: LeaveGroupRequest) {
    try {
      return await firstValueFrom(this.chatService.leaveGroup(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateMemberRole(data: UpdateMemberRoleRequest) {
    try {
      return await firstValueFrom(this.chatService.updateMemberRole(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async muteConversation(data: MuteConversationRequest) {
    try {
      return await firstValueFrom(this.chatService.muteConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async archiveConversation(data: ArchiveConversationRequest) {
    try {
      return await firstValueFrom(this.chatService.archiveConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async pinConversation(data: PinConversationRequest) {
    try {
      return await firstValueFrom(this.chatService.pinConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async sendMessage(
    data: SendMessageRequest | {
      conversationId: string;
      senderId: string;
      senderName?: string;
      senderAvatar?: string;
      text: string;
      mediaIds?: string[];
      type?: string;
      replyTo?: string;
      forwardedFromMessageId?: string;
      clientMessageId?: string;
    },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.sendMessage({
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName ?? '',
          senderAvatar: data.senderAvatar ?? '',
          text: data.text,
          mediaIds: data.mediaIds ?? [],
          type: data.type ?? 'text',
          replyTo: data.replyTo ?? '',
          forwardedFromMessageId: data.forwardedFromMessageId,
          clientMessageId: data.clientMessageId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMessages(
    data: GetMessagesRequest | {
      conversationId: string;
      userId: string;
      page?: number;
      limit?: number;
      beforeMessageId?: string;
      afterMessageId?: string;
    },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.getMessages({
          conversationId: data.conversationId,
          userId: data.userId,
          page: data.page ?? 1,
          limit: data.limit ?? 50,
          beforeMessageId: data.beforeMessageId,
          afterMessageId: data.afterMessageId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async editMessage(data: EditMessageRequest) {
    try {
      return await firstValueFrom(this.chatService.editMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteMessage(
    data: DeleteMessageRequest | { messageId: string; userId: string; forEveryone?: boolean },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.deleteMessage({
          messageId: data.messageId,
          userId: data.userId,
          forEveryone: data.forEveryone ?? false,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async forwardMessage(data: ForwardMessageRequest) {
    try {
      return await firstValueFrom(this.chatService.forwardMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async markReceipt(data: MarkReceiptRequest) {
    try {
      return await firstValueFrom(this.chatService.markReceipt(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async markAsRead(
    data: MarkAsReadRequest | { conversationId: string; userId: string; upToMessageId?: string },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.markAsRead({
          conversationId: data.conversationId,
          userId: data.userId,
          upToMessageId: data.upToMessageId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async reactToMessage(
    data: ReactToMessageRequest | { messageId: string; userId: string; emoji: string },
  ) {
    try {
      return await firstValueFrom(
        this.chatService.reactToMessage({
          messageId: data.messageId,
          userId: data.userId,
          emoji: data.emoji,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async pinMessage(data: PinMessageRequest) {
    try {
      return await firstValueFrom(this.chatService.pinMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getUnreadCounts(data: GetUnreadCountsRequest) {
    try {
      return await firstValueFrom(this.chatService.getUnreadCounts(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getGroupMembersForNotif(
    data: GetGroupMembersForNotifRequest,
  ): Promise<GetGroupMembersForNotifResponse> {
    try {
      return await firstValueFrom(
        this.chatService.getGroupMembersForNotif(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
