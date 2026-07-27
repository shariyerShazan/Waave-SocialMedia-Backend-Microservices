import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { E2eeChatService } from './e2ee-chat.service';
import type {
  AddGroupMemberRequest,
  ArchiveConversationRequest,
  ConversationResponse,
  CreateGroupRequest,
  DeleteMessageRequest,
  EditEncryptedMessageRequest,
  EncryptedMessageResponse,
  ForwardMessageRequest,
  GetConversationRequest,
  GetConversationsRequest,
  // GetConversationsResponse,
  GetMessagesRequest,
  GetOrCreateDirectRequest,
  GetPendingEnvelopesRequest,
  GetPendingEnvelopesResponse,
  GetSenderKeyRequest,
  GetSenderKeyResponse,
  GetUnreadCountsRequest,
  GetUnreadCountsResponse,
  LeaveGroupRequest,
  MarkConversationReadRequest,
  MarkReceiptRequest,
  MuteConversationRequest,
  OperationResponse,
  PinConversationRequest,
  PinMessageRequest,
  ReactToMessageRequest,
  RemoveGroupMemberRequest,
  SendEncryptedMessageRequest,
  UpdateMemberRoleRequest,
  UploadSenderKeyRequest,
} from '@app/proto-schema/protos-types/e2ee-chat';

@Controller()
export class E2eeChatGrpcController {
  constructor(private readonly e2eeChatService: E2eeChatService) {}

  @GrpcMethod('E2eeChatService', 'GetOrCreateDirectConversation')
  getOrCreateDirectConversation(
    request: GetOrCreateDirectRequest,
  ): Promise<ConversationResponse> {
    return this.e2eeChatService.getOrCreateDirectConversation(
      request.userId,
      request.targetUserId,
    );
  }

  @GrpcMethod('E2eeChatService', 'CreateGroup')
  createGroup(request: CreateGroupRequest): Promise<ConversationResponse> {
    return this.e2eeChatService.createGroup({
      name: request.name,
      creatorId: request.creatorId,
      participantIds: request.participantIds,
      avatar: request.avatar,
    });
  }

  @GrpcMethod('E2eeChatService', 'GetConversations')
  getConversations(request: GetConversationsRequest): Promise<any> {
    return this.e2eeChatService.getConversations(
      request.userId,
      request.page,
      request.limit,
      request.archived,
    );
  }

  @GrpcMethod('E2eeChatService', 'GetConversation')
  getConversation(
    request: GetConversationRequest,
  ): Promise<ConversationResponse> {
    return this.e2eeChatService.getConversation(
      request.conversationId,
      request.userId,
    );
  }

  @GrpcMethod('E2eeChatService', 'AddGroupMember')
  addGroupMember(request: AddGroupMemberRequest): Promise<OperationResponse> {
    return this.e2eeChatService.addGroupMember(
      request.conversationId,
      request.adminId,
      request.userId,
      request.role,
    );
  }

  @GrpcMethod('E2eeChatService', 'RemoveGroupMember')
  removeGroupMember(
    request: RemoveGroupMemberRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.removeGroupMember(
      request.conversationId,
      request.adminId,
      request.userId,
    );
  }

  @GrpcMethod('E2eeChatService', 'LeaveGroup')
  leaveGroup(request: LeaveGroupRequest): Promise<OperationResponse> {
    return this.e2eeChatService.leaveGroup(
      request.conversationId,
      request.userId,
    );
  }

  @GrpcMethod('E2eeChatService', 'UpdateMemberRole')
  updateMemberRole(
    request: UpdateMemberRoleRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.updateMemberRole(
      request.conversationId,
      request.adminId,
      request.userId,
      request.role,
    );
  }

  @GrpcMethod('E2eeChatService', 'MuteConversation')
  muteConversation(
    request: MuteConversationRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.muteConversation(
      request.conversationId,
      request.userId,
      request.muted,
      request.mutedUntil,
    );
  }

  @GrpcMethod('E2eeChatService', 'ArchiveConversation')
  archiveConversation(
    request: ArchiveConversationRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.archiveConversation(
      request.conversationId,
      request.userId,
      request.archived,
    );
  }

  @GrpcMethod('E2eeChatService', 'PinConversation')
  pinConversation(request: PinConversationRequest): Promise<OperationResponse> {
    return this.e2eeChatService.pinConversation(
      request.conversationId,
      request.userId,
      request.pinned,
    );
  }

  @GrpcMethod('E2eeChatService', 'SendEncryptedMessage')
  sendEncryptedMessage(
    request: SendEncryptedMessageRequest,
  ): Promise<EncryptedMessageResponse> {
    return this.e2eeChatService.sendEncryptedMessage({
      conversationId: request.conversationId,
      senderId: request.senderId,
      senderDeviceId: request.senderDeviceId,
      type: request.type,
      envelopes: request.envelopes.map((e) => this.toEnvelopeInput(e)),
      attachments: request.attachments?.map((a) => ({
        mediaId: a.mediaId,
        encryptedKey: a.encryptedKey,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        fileName: a.fileName,
      })),
      replyToMessageId: request.replyToMessageId,
      forwardedFromMessageId: request.forwardedFromMessageId,
      clientMessageId: request.clientMessageId,
    });
  }

  @GrpcMethod('E2eeChatService', 'GetMessages')
  getMessages(request: GetMessagesRequest) {
    return this.e2eeChatService.getMessages(
      request.conversationId,
      request.userId,
      request.deviceId,
      request.page,
      request.limit,
      request.beforeMessageId,
      request.afterMessageId,
    );
  }

  @GrpcMethod('E2eeChatService', 'GetPendingEnvelopes')
  getPendingEnvelopes(
    request: GetPendingEnvelopesRequest,
  ): Promise<GetPendingEnvelopesResponse> {
    return this.e2eeChatService.getPendingEnvelopes(
      request.userId,
      request.deviceId,
      request.limit,
    );
  }

  @GrpcMethod('E2eeChatService', 'EditEncryptedMessage')
  editEncryptedMessage(
    request: EditEncryptedMessageRequest,
  ): Promise<EncryptedMessageResponse> {
    return this.e2eeChatService.editEncryptedMessage({
      messageId: request.messageId,
      senderId: request.senderId,
      senderDeviceId: request.senderDeviceId,
      envelopes: request.envelopes.map((e) => this.toEnvelopeInput(e)),
    });
  }

  @GrpcMethod('E2eeChatService', 'DeleteMessage')
  deleteMessage(request: DeleteMessageRequest): Promise<OperationResponse> {
    return this.e2eeChatService.deleteMessage(
      request.messageId,
      request.userId,
      request.forEveryone,
    );
  }

  @GrpcMethod('E2eeChatService', 'ForwardMessage')
  forwardMessage(
    request: ForwardMessageRequest,
  ): Promise<EncryptedMessageResponse> {
    return this.e2eeChatService.forwardMessage({
      sourceMessageId: request.sourceMessageId,
      targetConversationId: request.targetConversationId,
      senderId: request.senderId,
      senderDeviceId: request.senderDeviceId,
      envelopes: request.envelopes.map((e) => this.toEnvelopeInput(e)),
      attachments: request.attachments?.map((a) => ({
        mediaId: a.mediaId,
        encryptedKey: a.encryptedKey,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        fileName: a.fileName,
      })),
    });
  }

  @GrpcMethod('E2eeChatService', 'MarkReceipt')
  markReceipt(request: MarkReceiptRequest): Promise<OperationResponse> {
    return this.e2eeChatService.markReceipt(
      request.messageId,
      request.userId,
      request.deviceId,
      request.status,
    );
  }

  @GrpcMethod('E2eeChatService', 'MarkConversationRead')
  markConversationRead(
    request: MarkConversationReadRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.markConversationRead(
      request.conversationId,
      request.userId,
      request.deviceId,
      request.upToMessageId,
    );
  }

  @GrpcMethod('E2eeChatService', 'ReactToMessage')
  reactToMessage(request: ReactToMessageRequest): Promise<OperationResponse> {
    return this.e2eeChatService.reactToMessage(
      request.messageId,
      request.userId,
      request.deviceId,
      request.emoji,
    );
  }

  @GrpcMethod('E2eeChatService', 'PinMessage')
  pinMessage(request: PinMessageRequest): Promise<OperationResponse> {
    return this.e2eeChatService.pinMessage(
      request.conversationId,
      request.messageId,
      request.userId,
      request.pinned,
    );
  }

  @GrpcMethod('E2eeChatService', 'UploadSenderKeyDistributions')
  uploadSenderKeyDistributions(
    request: UploadSenderKeyRequest,
  ): Promise<OperationResponse> {
    return this.e2eeChatService.uploadSenderKeyDistributions({
      conversationId: request.conversationId,
      senderId: request.senderId,
      senderDeviceId: request.senderDeviceId,
      distributions: request.distributions.map((e) => this.toEnvelopeInput(e)),
    });
  }

  @GrpcMethod('E2eeChatService', 'GetSenderKeyDistributions')
  getSenderKeyDistributions(
    request: GetSenderKeyRequest,
  ): Promise<GetSenderKeyResponse> {
    return this.e2eeChatService.getSenderKeyDistributions(
      request.conversationId,
      request.userId,
      request.deviceId,
    );
  }

  @GrpcMethod('E2eeChatService', 'GetUnreadCounts')
  getUnreadCounts(
    request: GetUnreadCountsRequest,
  ): Promise<GetUnreadCountsResponse> {
    return this.e2eeChatService.getUnreadCounts(request.userId);
  }

  private toEnvelopeInput(envelope: {
    recipientUserId: string;
    recipientDeviceId: string;
    payload?: {
      ciphertext: string;
      iv: string;
      authTag: string;
      ratchetHeader?: string;
      ephemeralKey?: string;
      oneTimePreKeyId?: number;
      signedPreKeyId?: number;
    };
  }) {
    return {
      recipientUserId: envelope.recipientUserId,
      recipientDeviceId: envelope.recipientDeviceId,
      payload: {
        ciphertext: envelope.payload?.ciphertext ?? '',
        iv: envelope.payload?.iv ?? '',
        authTag: envelope.payload?.authTag ?? '',
        ratchetHeader: envelope.payload?.ratchetHeader,
        ephemeralKey: envelope.payload?.ephemeralKey,
        oneTimePreKeyId: envelope.payload?.oneTimePreKeyId,
        signedPreKeyId: envelope.payload?.signedPreKeyId,
      },
    };
  }
}
