/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  ChatServiceController,
  ChatServiceControllerMethods,
  ConversationResponse,
  CreateGroupRequest,
  AddGroupMemberRequest,
  DeleteMessageRequest,
  GetConversationsRequest,
  GetConversationsResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  GetOrCreateConversationRequest,
  MarkAsReadRequest,
  MessageResponse,
  OperationResponse,
  ReactToMessageRequest,
  SendMessageRequest,
} from '@app/proto-schema/protos-types/chat';

@Controller()
@ChatServiceControllerMethods()
export class ChatGrpcController implements ChatServiceController {
  constructor(private readonly chatService: ChatService) {}

  async getOrCreateConversation(
    request: GetOrCreateConversationRequest,
  ): Promise<ConversationResponse> {
    const conversation = await this.chatService.getOrCreateConversation(
      request.userId1,
      request.userId2,
    );

    return {
      conversation: this.toConversation(conversation),
    };
  }

  async createGroup(
    request: CreateGroupRequest,
  ): Promise<ConversationResponse> {
    const conversation = await this.chatService.createGroup({
      name: request.name,
      creatorId: request.creatorId,
      participantIds: request.participantIds,
      avatar: request.avatar,
    });

    return {
      conversation: this.toConversation(conversation),
    };
  }

  async addGroupMember(
    request: AddGroupMemberRequest,
  ): Promise<OperationResponse> {
    await this.chatService.addGroupMember(
      request.conversationId,
      request.adminId,
      request.userId,
    );

    return {
      success: true,
      message: 'Member added successfully',
    };
  }

  async sendMessage(request: SendMessageRequest): Promise<MessageResponse> {
    const message = await this.chatService.sendMessage({
      conversationId: request.conversationId,
      senderId: request.senderId,
      senderName: request.senderName,
      senderAvatar: request.senderAvatar,
      text: request.text,
      mediaIds: request.mediaIds,
      type: request.type,
      replyTo: request.replyTo,
    });

    return {
      message: this.toMessage(message),
    };
  }

  async getMessages(request: GetMessagesRequest): Promise<GetMessagesResponse> {
    const result = await this.chatService.getMessages(
      request.conversationId,
      request.userId,
      request.page,
      request.limit,
    );

    return {
      messages: result.messages.map((m) => this.toMessage(m)),
      total: result.total,
      page: result.page,
    };
  }

  async deleteMessage(
    request: DeleteMessageRequest,
  ): Promise<OperationResponse> {
    await this.chatService.deleteMessage(request.messageId, request.userId);

    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }

  async markAsRead(request: MarkAsReadRequest): Promise<OperationResponse> {
    await this.chatService.markAsRead(request.conversationId, request.userId);

    return {
      success: true,
      message: 'Conversation marked as read',
    };
  }

  async reactToMessage(
    request: ReactToMessageRequest,
  ): Promise<MessageResponse> {
    const message = await this.chatService.reactToMessage(
      request.messageId,
      request.userId,
      request.emoji,
    );

    return {
      message: this.toMessage(message),
    };
  }

  async getConversations(
    request: GetConversationsRequest,
  ): Promise<GetConversationsResponse> {
    const result = await this.chatService.getConversations(
      request.userId,
      request.page,
      request.limit,
    );

    return {
      total: result.total,
      page: result.page,
      conversations: result.conversations.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        avatar: c.avatar,
        participants: c.participants,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt
          ? new Date(c.lastMessageAt).getTime()
          : 0,
        lastSenderId: c.lastSenderId,
        unreadCount: c.unreadCount,
        isOnline: c.isOnline,
      })),
    };
  }

  // ---------------- Mapping ----------------

  private toConversation(conversation: any) {
    return {
      id: conversation._id?.toString() ?? conversation.id,
      participants: conversation.participants,
      type: conversation.type,
      name: conversation.name,
      avatar: conversation.avatar,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt
        ? new Date(conversation.lastMessageAt).getTime()
        : 0,
      lastSenderId: conversation.lastSenderId,
      unreadCounts: conversation.unreadCounts ?? {},
      admins: conversation.admins ?? [],
      isDeleted: conversation.isDeleted,
      createdAt: new Date(conversation.createdAt).getTime(),
      updatedAt: new Date(conversation.updatedAt).getTime(),
    };
  }

  private toMessage(message: any) {
    return {
      id: message._id?.toString() ?? message.id,
      conversationId: message.conversationId,
      text: message.text,
      type: message.type,
      readBy: message.readBy ?? [],
      reactions: Object.entries(message.reactions ?? {}).reduce(
        (acc, [emoji, users]) => {
          acc[emoji] = {
            values: users as string[],
          };
          return acc;
        },
        {},
      ),
      isDeleted: message.isDeleted,
      replyTo: message.replyTo ?? '',
      createdAt: new Date(message.createdAt).getTime(),
      updatedAt: message.updatedAt ? new Date(message.updatedAt).getTime() : 0,
      sender: {
        id: message.senderId || '',
        username: message.senderName || '',
        fullName: message.senderName || '',
        avatar: message.senderAvatar || '',
        verified: false,
      },
      media: (message.mediaIds || []).map((id: string) => ({
        id,
        url: '',
        mimeType: '',
        type: 'IMAGE',
      })),
    };
  }
}
