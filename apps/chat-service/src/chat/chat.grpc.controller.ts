/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  AddGroupMemberRequest,
  ArchiveConversationRequest,
  ChatServiceController,
  ChatServiceControllerMethods,
  ConversationResponse,
  CreateGroupRequest,
  DeleteMessageRequest,
  EditMessageRequest,
  ForwardMessageRequest,
  GetConversationRequest,
  GetConversationsRequest,
  GetConversationsResponse,
  GetGroupMembersForNotifRequest,
  GetGroupMembersForNotifResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  GetOrCreateConversationRequest,
  GetUnreadCountsRequest,
  GetUnreadCountsResponse,
  LeaveGroupRequest,
  MarkAsReadRequest,
  MarkReceiptRequest,
  MessageResponse,
  MuteConversationRequest,
  OperationResponse,
  PinConversationRequest,
  PinMessageRequest,
  ReactToMessageRequest,
  RemoveGroupMemberRequest,
  SendMessageRequest,
  UpdateMemberRoleRequest,
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
      success: true,
      message: 'Conversation retrieved or created',
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
      success: true,
      message: 'Group created successfully',
      conversation: this.toConversation(conversation),
    };
  }

  async getConversation(
    request: GetConversationRequest,
  ): Promise<ConversationResponse> {
    const conversation = await this.chatService.getConversation(
      request.conversationId,
      request.userId,
    );

    return {
      success: true,
      message: 'Conversation fetched',
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
      request.role,
    );

    return {
      success: true,
      message: 'Member added successfully',
    };
  }

  async removeGroupMember(
    request: RemoveGroupMemberRequest,
  ): Promise<OperationResponse> {
    await this.chatService.removeGroupMember(
      request.conversationId,
      request.adminId,
      request.userId,
    );

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  async leaveGroup(request: LeaveGroupRequest): Promise<OperationResponse> {
    await this.chatService.leaveGroup(request.conversationId, request.userId);

    return {
      success: true,
      message: 'Left group successfully',
    };
  }

  async updateMemberRole(
    request: UpdateMemberRoleRequest,
  ): Promise<OperationResponse> {
    await this.chatService.updateMemberRole(
      request.conversationId,
      request.adminId,
      request.userId,
      request.role,
    );

    return {
      success: true,
      message: 'Member role updated successfully',
    };
  }

  async muteConversation(
    request: MuteConversationRequest,
  ): Promise<OperationResponse> {
    await this.chatService.muteConversation(
      request.conversationId,
      request.userId,
      request.muted,
      request.mutedUntil,
    );

    return {
      success: true,
      message: 'Conversation mute updated',
    };
  }

  async archiveConversation(
    request: ArchiveConversationRequest,
  ): Promise<OperationResponse> {
    await this.chatService.archiveConversation(
      request.conversationId,
      request.userId,
      request.archived,
    );

    return {
      success: true,
      message: 'Conversation archive updated',
    };
  }

  async pinConversation(
    request: PinConversationRequest,
  ): Promise<OperationResponse> {
    await this.chatService.pinConversation(
      request.conversationId,
      request.userId,
      request.pinned,
    );

    return {
      success: true,
      message: 'Conversation pin updated',
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
      forwardedFromMessageId: request.forwardedFromMessageId,
      clientMessageId: request.clientMessageId,
    });

    return {
      success: true,
      message: 'Message sent successfully',
      messageData: this.toMessage(message),
    };
  }

  async getMessages(request: GetMessagesRequest): Promise<GetMessagesResponse> {
    const result = await this.chatService.getMessages(
      request.conversationId,
      request.userId,
      request.page,
      request.limit,
      request.beforeMessageId,
      request.afterMessageId,
    );

    return {
      messages: result.messages.map((m) => this.toMessage(m)),
      total: result.total,
      page: result.page,
      hasMore: result.hasMore,
    };
  }

  async editMessage(request: EditMessageRequest): Promise<MessageResponse> {
    const message = await this.chatService.editMessage(
      request.messageId,
      request.senderId,
      request.text,
    );

    return {
      success: true,
      message: 'Message edited successfully',
      messageData: this.toMessage(message),
    };
  }

  async deleteMessage(
    request: DeleteMessageRequest,
  ): Promise<OperationResponse> {
    await this.chatService.deleteMessage(
      request.messageId,
      request.userId,
      request.forEveryone,
    );

    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }

  async forwardMessage(
    request: ForwardMessageRequest,
  ): Promise<MessageResponse> {
    const message = await this.chatService.forwardMessage({
      sourceMessageId: request.sourceMessageId,
      targetConversationId: request.targetConversationId,
      senderId: request.senderId,
    });

    return {
      success: true,
      message: 'Message forwarded successfully',
      messageData: this.toMessage(message),
    };
  }

  async markReceipt(request: MarkReceiptRequest): Promise<OperationResponse> {
    await this.chatService.markReceipt(
      request.messageId,
      request.userId,
      request.status,
    );

    return {
      success: true,
      message: 'Receipt marked',
    };
  }

  async markAsRead(request: MarkAsReadRequest): Promise<OperationResponse> {
    await this.chatService.markAsRead(
      request.conversationId,
      request.userId,
      request.upToMessageId,
    );

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
      success: true,
      message: 'Reaction updated',
      messageData: this.toMessage(message),
    };
  }

  async pinMessage(request: PinMessageRequest): Promise<OperationResponse> {
    await this.chatService.pinMessage(
      request.conversationId,
      request.messageId,
      request.userId,
      request.pinned,
    );

    return {
      success: true,
      message: 'Message pin updated',
    };
  }

  async getConversations(
    request: GetConversationsRequest,
  ): Promise<GetConversationsResponse> {
    const result = await this.chatService.getConversations(
      request.userId,
      request.page,
      request.limit,
      request.archived,
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
        muted: c.muted,
        archived: c.archived,
        pinned: c.pinned,
      })),
    };
  }

  async getUnreadCounts(
    request: GetUnreadCountsRequest,
  ): Promise<GetUnreadCountsResponse> {
    return this.chatService.getUnreadCounts(request.userId);
  }

  async getGroupMembersForNotif(
    request: GetGroupMembersForNotifRequest,
  ): Promise<GetGroupMembersForNotifResponse> {
    return this.chatService.getGroupMembersForNotif(request.conversationId);
  }

  // ---------------- Mapping ----------------

  private toConversation(conversation: any) {
    return {
      id: conversation._id?.toString() ?? conversation.id,
      participants: conversation.participants || [],
      type: conversation.type,
      name: conversation.name || '',
      avatar: conversation.avatar || '',
      lastMessage: conversation.lastMessage || '',
      lastMessageAt: conversation.lastMessageAt
        ? new Date(conversation.lastMessageAt).getTime()
        : 0,
      lastSenderId: conversation.lastSenderId || '',
      unreadCounts: conversation.unreadCounts ?? {},
      admins: conversation.admins ?? [],
      isDeleted: conversation.isDeleted ?? false,
      createdAt: new Date(conversation.createdAt).getTime(),
      updatedAt: new Date(conversation.updatedAt).getTime(),
      members: (conversation.members || []).map((m: any) => ({
        userId: m.userId,
        role: m.role || 'MEMBER',
        muted: m.muted ?? false,
        mutedUntil: m.mutedUntil ? new Date(m.mutedUntil).toISOString() : undefined,
        archived: m.archived ?? false,
        pinned: m.pinned ?? false,
        unreadCount: m.unreadCount ?? 0,
        leftAt: m.leftAt ? new Date(m.leftAt).toISOString() : undefined,
        joinedAt: new Date(m.joinedAt || Date.now()).toISOString(),
      })),
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
      isDeleted: message.isDeleted ?? false,
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
      forwardedFromMessageId: message.forwardedFromMessageId ?? undefined,
      clientMessageId: message.clientMessageId ?? undefined,
      isEdited: message.isEdited ?? false,
      editedAt: message.editedAt ? new Date(message.editedAt).getTime() : undefined,
      isPinned: message.isPinned ?? false,
    };
  }
}
