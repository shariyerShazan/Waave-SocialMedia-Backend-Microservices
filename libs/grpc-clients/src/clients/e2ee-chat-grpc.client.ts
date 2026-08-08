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
  E2EE_CHAT_SERVICE_NAME,
  E2eeChatServiceClient,
  type AddGroupMemberRequest,
  type ArchiveConversationRequest,
  type CreateGroupRequest,
  type DeleteMessageRequest,
  type EditEncryptedMessageRequest,
  type ForwardMessageRequest,
  type GetConversationRequest,
  type GetConversationsRequest,
  type GetMessagesRequest,
  type GetOrCreateDirectRequest,
  type GetPendingEnvelopesRequest,
  type GetSenderKeyRequest,
  type GetUnreadCountsRequest,
  type LeaveGroupRequest,
  type MarkConversationReadRequest,
  type MarkReceiptRequest,
  type MuteConversationRequest,
  type PinConversationRequest,
  type PinMessageRequest,
  type ReactToMessageRequest,
  type RemoveGroupMemberRequest,
  type SendEncryptedMessageRequest,
  type UpdateMemberRoleRequest,
  type UploadSenderKeyRequest,
} from '@app/proto-schema/protos-types/e2ee-chat';

@Injectable()
export class E2eeChatGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'e2ee_chat',
      protoPath: join(
        __dirname,
        '../../../libs/proto-schema/src/proto/e2ee-chat.proto',
      ),
      url: process.env.E2EE_CHAT_SERVICE_GRPC_URL || 'localhost:3006',
    },
  })
  private client: ClientGrpc;

  private e2eeChatService: E2eeChatServiceClient;

  onModuleInit() {
    this.e2eeChatService = this.client.getService<E2eeChatServiceClient>(
      E2EE_CHAT_SERVICE_NAME,
    );
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message:
          err?.message ?? err?.details ?? 'E2EE chat service unavailable',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async getOrCreateDirectConversation(data: GetOrCreateDirectRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.getOrCreateDirectConversation(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async createGroup(data: CreateGroupRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.createGroup(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getConversations(data: GetConversationsRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.getConversations(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getConversation(data: GetConversationRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.getConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async addGroupMember(data: AddGroupMemberRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.addGroupMember(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async removeGroupMember(data: RemoveGroupMemberRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.removeGroupMember(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async leaveGroup(data: LeaveGroupRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.leaveGroup(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateMemberRole(data: UpdateMemberRoleRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.updateMemberRole(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async muteConversation(data: MuteConversationRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.muteConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async archiveConversation(data: ArchiveConversationRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.archiveConversation(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async pinConversation(data: PinConversationRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.pinConversation(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async sendEncryptedMessage(data: SendEncryptedMessageRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.sendEncryptedMessage(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMessages(data: GetMessagesRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.getMessages(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getPendingEnvelopes(data: GetPendingEnvelopesRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.getPendingEnvelopes(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async editEncryptedMessage(data: EditEncryptedMessageRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.editEncryptedMessage(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteMessage(data: DeleteMessageRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.deleteMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async forwardMessage(data: ForwardMessageRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.forwardMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async markReceipt(data: MarkReceiptRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.markReceipt(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async markConversationRead(data: MarkConversationReadRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.markConversationRead(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async reactToMessage(data: ReactToMessageRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.reactToMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async pinMessage(data: PinMessageRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.pinMessage(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async uploadSenderKeyDistributions(data: UploadSenderKeyRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.uploadSenderKeyDistributions(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getSenderKeyDistributions(data: GetSenderKeyRequest) {
    try {
      return await firstValueFrom(
        this.e2eeChatService.getSenderKeyDistributions(data),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getUnreadCounts(data: GetUnreadCountsRequest) {
    try {
      return await firstValueFrom(this.e2eeChatService.getUnreadCounts(data));
    } catch (err) {
      this.handleError(err);
    }
  }
}
