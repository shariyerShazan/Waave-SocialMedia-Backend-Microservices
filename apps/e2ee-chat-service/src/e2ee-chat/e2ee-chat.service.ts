/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  ChatType,
  MemberRole,
  MessageType,
  ReceiptStatus,
  Prisma,
} from '@prisma/e2ee-chat-client';
import { E2eeChatPrismaService } from '../prisma/prisma.service';
import { E2eeChatRedisService } from '../redis/redis.service';
import { E2eeChatEnrichmentService } from './enrichments/enrichment.service';

const NOT_FOUND = 5;
const PERMISSION_DENIED = 7;
const INVALID_ARGUMENT = 3;

export interface CipherPayloadInput {
  ciphertext: string;
  iv: string;
  authTag: string;
  ratchetHeader?: string;
  ephemeralKey?: string;
  oneTimePreKeyId?: number;
  signedPreKeyId?: number;
}

export interface MessageEnvelopeInput {
  recipientUserId: string;
  recipientDeviceId: string;
  payload: CipherPayloadInput;
}

export interface EncryptedAttachmentInput {
  mediaId: string;
  encryptedKey: string;
  mimeType?: string;
  sizeBytes?: number;
  fileName?: string;
}

type MessageWithRelations = Prisma.EncryptedMessageGetPayload<{
  include: {
    envelopes: true;
    attachments: true;
    receipts: true;
    reactions: true;
  };
}>;

type ConversationWithMembers = Prisma.ConversationGetPayload<{
  include: { members: true };
}>;

@Injectable()
export class E2eeChatService {
  private readonly logger = new Logger(E2eeChatService.name);

  constructor(
    private readonly prisma: E2eeChatPrismaService,
    private readonly redis: E2eeChatRedisService,
    private readonly enrichment: E2eeChatEnrichmentService,
  ) {}

  buildDirectKey(userId: string, targetUserId: string): string {
    return [userId, targetUserId].sort().join(':');
  }

  mapCipherPayload(payload: {
    ciphertext: string;
    iv: string;
    authTag: string;
    ratchetHeader?: string | null;
    ephemeralKey?: string | null;
    oneTimePreKeyId?: number | null;
    signedPreKeyId?: number | null;
  }) {
    return {
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      ratchetHeader: payload.ratchetHeader ?? undefined,
      ephemeralKey: payload.ephemeralKey ?? undefined,
      oneTimePreKeyId: payload.oneTimePreKeyId ?? undefined,
      signedPreKeyId: payload.signedPreKeyId ?? undefined,
    };
  }

  mapEnvelope(envelope: {
    id: string;
    messageId: string;
    recipientUserId: string;
    recipientDeviceId: string;
    ciphertext: string;
    iv: string;
    authTag: string;
    ratchetHeader?: string | null;
    ephemeralKey?: string | null;
    oneTimePreKeyId?: number | null;
    signedPreKeyId?: number | null;
    delivered: boolean;
    deliveredAt?: Date | null;
    createdAt: Date;
  }) {
    return {
      id: envelope.id,
      messageId: envelope.messageId,
      recipientUserId: envelope.recipientUserId,
      recipientDeviceId: envelope.recipientDeviceId,
      payload: this.mapCipherPayload(envelope),
      delivered: envelope.delivered,
      deliveredAt: envelope.deliveredAt
        ? envelope.deliveredAt.getTime()
        : undefined,
      createdAt: envelope.createdAt.toISOString(),
    };
  }

  mapMessage(message: MessageWithRelations, userId: string, deviceId: string) {
    const filteredEnvelopes = message.envelopes.filter(
      (env) =>
        env.recipientDeviceId === deviceId || message.senderId === userId,
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderDeviceId: message.senderDeviceId,
      type: message.type,
      replyToMessageId: message.replyToMessageId ?? undefined,
      forwardedFromMessageId: message.forwardedFromMessageId ?? undefined,
      clientMessageId: message.clientMessageId ?? undefined,
      isDeleted: message.isDeleted,
      isEdited: message.isEdited,
      editedAt: message.editedAt ? message.editedAt.getTime() : undefined,
      attachments: message.attachments.map((a) => ({
        mediaId: a.mediaId,
        encryptedKey: a.encryptedKey,
        mimeType: a.mimeType ?? undefined,
        sizeBytes: a.sizeBytes != null ? Number(a.sizeBytes) : undefined,
        fileName: a.fileName ?? undefined,
      })),
      envelopes: filteredEnvelopes.map((e) => this.mapEnvelope(e)),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  mapConversation(conversation: ConversationWithMembers) {
    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name ?? undefined,
      avatar: conversation.avatar ?? undefined,
      createdBy: conversation.createdBy,
      isDeleted: conversation.isDeleted,
      lastMessageId: conversation.lastMessageId ?? undefined,
      lastMessageAt: conversation.lastMessageAt
        ? conversation.lastMessageAt.getTime()
        : undefined,
      lastSenderId: conversation.lastSenderId ?? '',
      members: conversation.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        muted: m.muted,
        mutedUntil: m.mutedUntil?.toISOString(),
        archived: m.archived,
        pinned: m.pinned,
        unreadCount: m.unreadCount,
        leftAt: m.leftAt?.toISOString(),
        joinedAt: m.joinedAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private async getActiveMember(conversationId: string, userId: string) {
    const member = await this.prisma.readDb.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!member) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Not a member of this conversation',
      });
    }

    return member;
  }

  private async assertAdmin(conversationId: string, adminId: string) {
    const member = await this.getActiveMember(conversationId, adminId);
    if (member.role !== MemberRole.ADMIN && member.role !== MemberRole.OWNER) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Admin privileges required',
      });
    }
    return member;
  }

  private envelopeCreateData(envelope: MessageEnvelopeInput) {
    return {
      recipientUserId: envelope.recipientUserId,
      recipientDeviceId: envelope.recipientDeviceId,
      ciphertext: envelope.payload.ciphertext,
      iv: envelope.payload.iv,
      authTag: envelope.payload.authTag,
      ratchetHeader: envelope.payload.ratchetHeader,
      ephemeralKey: envelope.payload.ephemeralKey,
      oneTimePreKeyId: envelope.payload.oneTimePreKeyId,
      signedPreKeyId: envelope.payload.signedPreKeyId,
    };
  }

  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'Cannot create direct conversation with yourself',
      });
    }

    const directKey = this.buildDirectKey(userId, targetUserId);

    const existing = await this.prisma.readDb.conversation.findUnique({
      where: { directKey },
      include: { members: true },
    });

    if (existing && !existing.isDeleted) {
      return {
        success: true,
        message: 'Conversation retrieved',
        conversation: await this.enrichment.enrichConversation(
          this.mapConversation(existing),
          userId,
        ),
      };
    }

    const conversation = await this.prisma.writeDb.conversation.create({
      data: {
        type: ChatType.DIRECT,
        createdBy: userId,
        directKey,
        members: {
          create: [
            { userId, role: MemberRole.MEMBER },
            { userId: targetUserId, role: MemberRole.MEMBER },
          ],
        },
      },
      include: { members: true },
    });

    this.logger.log(
      `Direct conversation created: ${conversation.id} [${directKey}]`,
    );

    return {
      success: true,
      message: 'Conversation created',
      conversation: await this.enrichment.enrichConversation(
        this.mapConversation(conversation),
        userId,
      ),
    };
  }

  async createGroup(data: {
    name: string;
    creatorId: string;
    participantIds: string[];
    avatar?: string;
  }) {
    const participants = [...new Set([data.creatorId, ...data.participantIds])];

    if (participants.length < 2) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'Group requires at least 2 participants',
      });
    }

    const conversation = await this.prisma.writeDb.conversation.create({
      data: {
        type: ChatType.GROUP,
        name: data.name,
        avatar: data.avatar,
        createdBy: data.creatorId,
        members: {
          create: participants.map((userId) => ({
            userId,
            role:
              userId === data.creatorId ? MemberRole.OWNER : MemberRole.MEMBER,
          })),
        },
      },
      include: { members: true },
    });

    this.logger.log(`Group created: ${conversation.id} by ${data.creatorId}`);

    return {
      success: true,
      message: 'Group created',
      conversation: await this.enrichment.enrichConversation(
        this.mapConversation(conversation),
        data.creatorId,
      ),
    };
  }

  async getConversations(
    userId: string,
    page: number,
    limit: number,
    archived?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const archivedFilter = archived === true;

    const where: Prisma.ConversationMemberWhereInput = {
      userId,
      leftAt: null,
      archived: archivedFilter,
      conversation: { isDeleted: false },
    };

    const [memberships, total] = await Promise.all([
      this.prisma.readDb.conversationMember.findMany({
        where,
        include: {
          conversation: {
            include: {
              members: { where: { leftAt: null } },
            },
          },
        },
        orderBy: [
          { pinned: 'desc' },
          { conversation: { lastMessageAt: 'desc' } },
        ],
        skip,
        take: limit,
      }),
      this.prisma.readDb.conversationMember.count({ where }),
    ]);

    const otherUserIds = [
      ...new Set(
        memberships.flatMap((m) =>
          m.conversation.members
            .map((mem) => mem.userId)
            .filter((id) => id !== userId),
        ),
      ),
    ];

    const onlineSet = await this.redis.getOnlineUsers(otherUserIds);

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const conv = membership.conversation;
        const participantIds = conv.members.map((m) => m.userId);
        const otherIds = participantIds.filter((id) => id !== userId);

        const cachedUnread = await this.redis.getUnreadCount(userId, conv.id);

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name ?? undefined,
          avatar: conv.avatar ?? undefined,
          participantIds,
          lastMessageId: conv.lastMessageId ?? undefined,
          lastMessageAt: conv.lastMessageAt
            ? conv.lastMessageAt.getTime()
            : undefined,
          lastSenderId: conv.lastSenderId ?? '',
          unreadCount: cachedUnread || membership.unreadCount,
          muted: membership.muted,
          archived: membership.archived,
          pinned: membership.pinned,
          isOnline: otherIds.some((id) => onlineSet.has(id)),
        };
      }),
    );

    const enriched = await this.enrichment.enrichConversations(
      conversations,
      userId,
    );

    return {
      success: true,
      conversations: enriched,
      total,
      page,
    };
  }

  async getConversation(conversationId: string, userId: string) {
    await this.getActiveMember(conversationId, userId);

    const conversation = await this.prisma.readDb.conversation.findFirst({
      where: { id: conversationId, isDeleted: false },
      include: { members: true },
    });

    if (!conversation) {
      throw new RpcException({
        code: NOT_FOUND,
        message: 'Conversation not found',
      });
    }

    return {
      success: true,
      message: 'Conversation retrieved',
      conversation: await this.enrichment.enrichConversation(
        this.mapConversation(conversation),
        userId,
      ),
    };
  }

  async addGroupMember(
    conversationId: string,
    adminId: string,
    userId: string,
    role?: string,
  ) {
    await this.assertAdmin(conversationId, adminId);

    const conversation = await this.prisma.readDb.conversation.findFirst({
      where: { id: conversationId, type: ChatType.GROUP, isDeleted: false },
    });

    if (!conversation) {
      throw new RpcException({
        code: NOT_FOUND,
        message: 'Group not found',
      });
    }

    const memberRole = this.parseMemberRole(role);

    await this.prisma.writeDb.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: {
        conversationId,
        userId,
        role: memberRole,
      },
      update: {
        leftAt: null,
        role: memberRole,
      },
    });

    return { success: true, message: 'Member added' };
  }

  async removeGroupMember(
    conversationId: string,
    adminId: string,
    userId: string,
  ) {
    await this.assertAdmin(conversationId, adminId);

    const target = await this.prisma.readDb.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!target || target.leftAt) {
      throw new RpcException({ code: NOT_FOUND, message: 'Member not found' });
    }

    if (target.role === MemberRole.OWNER) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Cannot remove group owner',
      });
    }

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });

    return { success: true, message: 'Member removed' };
  }

  async leaveGroup(conversationId: string, userId: string) {
    const member = await this.getActiveMember(conversationId, userId);

    const conversation = await this.prisma.readDb.conversation.findFirst({
      where: { id: conversationId, type: ChatType.GROUP },
    });

    if (!conversation) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'Not a group conversation',
      });
    }

    if (member.role === MemberRole.OWNER) {
      const adminCount = await this.prisma.readDb.conversationMember.count({
        where: {
          conversationId,
          leftAt: null,
          role: { in: [MemberRole.ADMIN, MemberRole.OWNER] },
          userId: { not: userId },
        },
      });

      if (adminCount === 0) {
        const nextMember =
          await this.prisma.readDb.conversationMember.findFirst({
            where: {
              conversationId,
              leftAt: null,
              userId: { not: userId },
            },
            orderBy: { joinedAt: 'asc' },
          });

        if (nextMember) {
          await this.prisma.writeDb.conversationMember.update({
            where: { id: nextMember.id },
            data: { role: MemberRole.OWNER },
          });
        }
      }
    }

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });

    return { success: true, message: 'Left group' };
  }

  async updateMemberRole(
    conversationId: string,
    adminId: string,
    userId: string,
    role: string,
  ) {
    await this.assertAdmin(conversationId, adminId);

    const target = await this.getActiveMember(conversationId, userId);
    const newRole = this.parseMemberRole(role);

    if (target.role === MemberRole.OWNER) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Cannot change owner role',
      });
    }

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { role: newRole },
    });

    return { success: true, message: 'Role updated' };
  }

  async muteConversation(
    conversationId: string,
    userId: string,
    muted: boolean,
    mutedUntil?: string,
  ) {
    await this.getActiveMember(conversationId, userId);

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: {
        muted,
        mutedUntil: muted && mutedUntil ? new Date(mutedUntil) : null,
      },
    });

    return {
      success: true,
      message: muted ? 'Conversation muted' : 'Conversation unmuted',
    };
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
    archived: boolean,
  ) {
    await this.getActiveMember(conversationId, userId);

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archived },
    });

    return {
      success: true,
      message: archived ? 'Conversation archived' : 'Conversation unarchived',
    };
  }

  async pinConversation(
    conversationId: string,
    userId: string,
    pinned: boolean,
  ) {
    await this.getActiveMember(conversationId, userId);

    await this.prisma.writeDb.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { pinned },
    });

    return {
      success: true,
      message: pinned ? 'Conversation pinned' : 'Conversation unpinned',
    };
  }

  async sendEncryptedMessage(data: {
    conversationId: string;
    senderId: string;
    senderDeviceId: string;
    type: string;
    envelopes: MessageEnvelopeInput[];
    attachments?: EncryptedAttachmentInput[];
    replyToMessageId?: string;
    forwardedFromMessageId?: string;
    clientMessageId?: string;
  }) {
    if (!data.envelopes?.length) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'At least one envelope is required',
      });
    }

    await this.getActiveMember(data.conversationId, data.senderId);

    if (data.clientMessageId) {
      const existing = await this.prisma.readDb.encryptedMessage.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId: data.conversationId,
            clientMessageId: data.clientMessageId,
          },
        },
        include: {
          envelopes: true,
          attachments: true,
          receipts: true,
          reactions: true,
        },
      });

      if (existing) {
        return {
          success: true,
          message: 'Message already sent',
          encryptedMessage: await this.enrichment.enrichMessage(
            this.mapMessage(existing, data.senderId, data.senderDeviceId),
          ),
        };
      }
    }

    const messageType = this.parseMessageType(data.type);

    const message = await this.prisma.writeDb.$transaction(async (tx) => {
      const created = await tx.encryptedMessage.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderDeviceId: data.senderDeviceId,
          type: messageType,
          replyToMessageId: data.replyToMessageId,
          forwardedFromMessageId: data.forwardedFromMessageId,
          clientMessageId: data.clientMessageId,
          envelopes: {
            create: data.envelopes.map((e) => this.envelopeCreateData(e)),
          },
          attachments: data.attachments?.length
            ? {
                create: data.attachments.map((a) => ({
                  mediaId: a.mediaId,
                  encryptedKey: a.encryptedKey,
                  mimeType: a.mimeType,
                  sizeBytes:
                    a.sizeBytes != null ? BigInt(a.sizeBytes) : undefined,
                  fileName: a.fileName,
                })),
              }
            : undefined,
        },
        include: {
          envelopes: true,
          attachments: true,
          receipts: true,
          reactions: true,
        },
      });

      const recipientKeys = new Map<string, Set<string>>();
      for (const env of data.envelopes) {
        if (env.recipientUserId === data.senderId) continue;
        if (!recipientKeys.has(env.recipientUserId)) {
          recipientKeys.set(env.recipientUserId, new Set());
        }
        recipientKeys.get(env.recipientUserId)!.add(env.recipientDeviceId);
      }

      for (const [recipientUserId, deviceIds] of recipientKeys) {
        for (const deviceId of deviceIds) {
          await tx.messageReceipt.upsert({
            where: {
              messageId_userId_deviceId: {
                messageId: created.id,
                userId: recipientUserId,
                deviceId,
              },
            },
            create: {
              messageId: created.id,
              userId: recipientUserId,
              deviceId,
              status: ReceiptStatus.SENT,
            },
            update: { status: ReceiptStatus.SENT },
          });
        }

        await tx.conversationMember.updateMany({
          where: {
            conversationId: data.conversationId,
            userId: recipientUserId,
            leftAt: null,
          },
          data: { unreadCount: { increment: 1 } },
        });
      }

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessageId: created.id,
          lastMessageAt: created.createdAt,
          lastSenderId: data.senderId,
        },
      });

      return created;
    });

    const recipientUserIds = [
      ...new Set(
        data.envelopes
          .map((e) => e.recipientUserId)
          .filter((id) => id !== data.senderId),
      ),
    ];

    for (const recipientUserId of recipientUserIds) {
      await this.redis.incrUnread(recipientUserId, data.conversationId);
    }

    await this.redis.invalidateMessageCache(data.conversationId);

    this.logger.debug(
      `Encrypted message sent: ${message.id} in ${data.conversationId}`,
    );

    return {
      success: true,
      message: 'Message sent',
      encryptedMessage: await this.enrichment.enrichMessage(
        this.mapMessage(message, data.senderId, data.senderDeviceId),
      ),
    };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    deviceId: string,
    page: number,
    limit: number,
    beforeMessageId?: string,
    afterMessageId?: string,
  ) {
    await this.getActiveMember(conversationId, userId);

    if (page === 1 && !beforeMessageId && !afterMessageId) {
      const cached = await this.redis.getRecentMessages(
        conversationId,
        userId,
        deviceId,
      );
      if (cached) {
        return {
          success: true,
          messages: cached,
          total: cached.length,
          page,
          hasMore: false,
        };
      }
    }

    const where: Prisma.EncryptedMessageWhereInput = {
      conversationId,
      isDeleted: false,
    };

    if (beforeMessageId) {
      const cursor = await this.prisma.readDb.encryptedMessage.findUnique({
        where: { id: beforeMessageId },
        select: { createdAt: true },
      });
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt };
      }
    }

    if (afterMessageId) {
      const cursor = await this.prisma.readDb.encryptedMessage.findUnique({
        where: { id: afterMessageId },
        select: { createdAt: true },
      });
      if (cursor) {
        where.createdAt = { gt: cursor.createdAt };
      }
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.readDb.encryptedMessage.findMany({
        where,
        include: {
          envelopes: true,
          attachments: true,
          receipts: true,
          reactions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.readDb.encryptedMessage.count({ where }),
    ]);

    const formatted = messages
      .reverse()
      .map((m) => this.mapMessage(m, userId, deviceId));

    const enriched = await this.enrichment.enrichMessages(formatted);

    if (page === 1 && !beforeMessageId && !afterMessageId) {
      await this.redis.cacheRecentMessages(
        conversationId,
        userId,
        deviceId,
        enriched,
      );
    }

    return {
      success: true,
      messages: enriched,
      total,
      page,
      hasMore: skip + messages.length < total,
    };
  }

  async getPendingEnvelopes(userId: string, deviceId: string, limit: number) {
    const envelopes = await this.prisma.readDb.messageEnvelope.findMany({
      where: {
        recipientUserId: userId,
        recipientDeviceId: deviceId,
        delivered: false,
        message: { isDeleted: false },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return {
      success: true,
      envelopes: envelopes.map((e) => this.mapEnvelope(e)),
    };
  }

  async editEncryptedMessage(data: {
    messageId: string;
    senderId: string;
    senderDeviceId: string;
    envelopes: MessageEnvelopeInput[];
  }) {
    if (!data.envelopes?.length) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'At least one envelope is required',
      });
    }

    const message = await this.prisma.readDb.encryptedMessage.findUnique({
      where: { id: data.messageId },
    });

    if (!message || message.isDeleted) {
      throw new RpcException({ code: NOT_FOUND, message: 'Message not found' });
    }

    if (message.senderId !== data.senderId) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Only the sender can edit this message',
      });
    }

    const updated = await this.prisma.writeDb.$transaction(async (tx) => {
      await tx.messageEnvelope.deleteMany({
        where: { messageId: data.messageId },
      });

      return tx.encryptedMessage.update({
        where: { id: data.messageId },
        data: {
          isEdited: true,
          editedAt: new Date(),
          envelopes: {
            create: data.envelopes.map((e) => this.envelopeCreateData(e)),
          },
        },
        include: {
          envelopes: true,
          attachments: true,
          receipts: true,
          reactions: true,
        },
      });
    });

    await this.redis.invalidateMessageCache(message.conversationId);

    return {
      success: true,
      message: 'Message edited',
      encryptedMessage: await this.enrichment.enrichMessage(
        this.mapMessage(updated, data.senderId, data.senderDeviceId),
      ),
    };
  }

  async deleteMessage(
    messageId: string,
    userId: string,
    _forEveryone?: boolean,
  ) {
    const message = await this.prisma.readDb.encryptedMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.isDeleted) {
      throw new RpcException({ code: NOT_FOUND, message: 'Message not found' });
    }

    if (message.senderId !== userId) {
      throw new RpcException({
        code: PERMISSION_DENIED,
        message: 'Only the sender can delete this message',
      });
    }

    await this.prisma.writeDb.encryptedMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    await this.redis.invalidateMessageCache(message.conversationId);

    return { success: true, message: 'Message deleted' };
  }

  async forwardMessage(data: {
    sourceMessageId: string;
    targetConversationId: string;
    senderId: string;
    senderDeviceId: string;
    envelopes: MessageEnvelopeInput[];
    attachments?: EncryptedAttachmentInput[];
  }) {
    const source = await this.prisma.readDb.encryptedMessage.findUnique({
      where: { id: data.sourceMessageId },
    });

    if (!source || source.isDeleted) {
      throw new RpcException({
        code: NOT_FOUND,
        message: 'Source message not found',
      });
    }

    await this.getActiveMember(data.targetConversationId, data.senderId);

    return this.sendEncryptedMessage({
      conversationId: data.targetConversationId,
      senderId: data.senderId,
      senderDeviceId: data.senderDeviceId,
      type: source.type,
      envelopes: data.envelopes,
      attachments: data.attachments,
      forwardedFromMessageId: data.sourceMessageId,
    });
  }

  async markReceipt(
    messageId: string,
    userId: string,
    deviceId: string,
    status: string,
  ) {
    const receiptStatus = this.parseReceiptStatus(status);

    const message = await this.prisma.readDb.encryptedMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.isDeleted) {
      throw new RpcException({ code: NOT_FOUND, message: 'Message not found' });
    }

    if (message.senderId === userId) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'Sender cannot mark receipt on own message',
      });
    }

    await this.getActiveMember(message.conversationId, userId);

    await this.prisma.writeDb.messageReceipt.upsert({
      where: {
        messageId_userId_deviceId: { messageId, userId, deviceId },
      },
      create: {
        messageId,
        userId,
        deviceId,
        status: receiptStatus,
      },
      update: { status: receiptStatus },
    });

    if (receiptStatus === ReceiptStatus.DELIVERED) {
      await this.prisma.writeDb.messageEnvelope.updateMany({
        where: {
          messageId,
          recipientUserId: userId,
          recipientDeviceId: deviceId,
        },
        data: { delivered: true, deliveredAt: new Date() },
      });
    }

    return { success: true, message: 'Receipt updated' };
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
    deviceId: string,
    upToMessageId?: string,
  ) {
    const member = await this.getActiveMember(conversationId, userId);

    let upToCreatedAt: Date | undefined;
    if (upToMessageId) {
      const upToMessage = await this.prisma.readDb.encryptedMessage.findFirst({
        where: { id: upToMessageId, conversationId },
        select: { createdAt: true },
      });
      if (upToMessage) {
        upToCreatedAt = upToMessage.createdAt;
      }
    }

    await this.prisma.writeDb.$transaction(async (tx) => {
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: {
          unreadCount: 0,
          lastReadMessageId: upToMessageId ?? member.lastReadMessageId,
        },
      });

      const messages = await tx.encryptedMessage.findMany({
        where: {
          conversationId,
          isDeleted: false,
          senderId: { not: userId },
          ...(upToCreatedAt ? { createdAt: { lte: upToCreatedAt } } : {}),
        },
        select: { id: true },
      });

      for (const msg of messages) {
        await tx.messageReceipt.upsert({
          where: {
            messageId_userId_deviceId: {
              messageId: msg.id,
              userId,
              deviceId,
            },
          },
          create: {
            messageId: msg.id,
            userId,
            deviceId,
            status: ReceiptStatus.READ,
          },
          update: { status: ReceiptStatus.READ },
        });
      }
    });

    await this.redis.clearUnread(userId, conversationId);
    await this.redis.invalidateMessageCache(conversationId);

    return { success: true, message: 'Conversation marked as read' };
  }

  async reactToMessage(
    messageId: string,
    userId: string,
    deviceId: string,
    emoji: string,
  ) {
    const message = await this.prisma.readDb.encryptedMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.isDeleted) {
      throw new RpcException({ code: NOT_FOUND, message: 'Message not found' });
    }

    await this.getActiveMember(message.conversationId, userId);

    const existing = await this.prisma.readDb.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (existing) {
      await this.prisma.writeDb.messageReaction.delete({
        where: { id: existing.id },
      });
      return { success: true, message: 'Reaction removed' };
    }

    await this.prisma.writeDb.messageReaction.create({
      data: { messageId, userId, deviceId, emoji },
    });

    await this.redis.invalidateMessageCache(message.conversationId);

    return { success: true, message: 'Reaction added' };
  }

  async pinMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    pinned: boolean,
  ) {
    await this.getActiveMember(conversationId, userId);

    const message = await this.prisma.readDb.encryptedMessage.findFirst({
      where: { id: messageId, conversationId, isDeleted: false },
    });

    if (!message) {
      throw new RpcException({ code: NOT_FOUND, message: 'Message not found' });
    }

    if (pinned) {
      await this.prisma.writeDb.pinnedMessage.upsert({
        where: {
          conversationId_messageId: { conversationId, messageId },
        },
        create: { conversationId, messageId, pinnedBy: userId },
        update: { pinnedBy: userId },
      });
    } else {
      await this.prisma.writeDb.pinnedMessage.deleteMany({
        where: { conversationId, messageId },
      });
    }

    return {
      success: true,
      message: pinned ? 'Message pinned' : 'Message unpinned',
    };
  }

  async uploadSenderKeyDistributions(data: {
    conversationId: string;
    senderId: string;
    senderDeviceId: string;
    distributions: MessageEnvelopeInput[];
  }) {
    await this.getActiveMember(data.conversationId, data.senderId);

    if (!data.distributions?.length) {
      throw new RpcException({
        code: INVALID_ARGUMENT,
        message: 'At least one distribution is required',
      });
    }

    await this.prisma.writeDb.$transaction(async (tx) => {
      for (const dist of data.distributions) {
        await tx.senderKeyDistribution.upsert({
          where: {
            conversationId_senderUserId_senderDeviceId_recipientUserId_recipientDeviceId:
              {
                conversationId: data.conversationId,
                senderUserId: data.senderId,
                senderDeviceId: data.senderDeviceId,
                recipientUserId: dist.recipientUserId,
                recipientDeviceId: dist.recipientDeviceId,
              },
          },
          create: {
            conversationId: data.conversationId,
            senderUserId: data.senderId,
            senderDeviceId: data.senderDeviceId,
            recipientUserId: dist.recipientUserId,
            recipientDeviceId: dist.recipientDeviceId,
            ciphertext: dist.payload.ciphertext,
            iv: dist.payload.iv,
            authTag: dist.payload.authTag,
            ratchetHeader: dist.payload.ratchetHeader,
          },
          update: {
            ciphertext: dist.payload.ciphertext,
            iv: dist.payload.iv,
            authTag: dist.payload.authTag,
            ratchetHeader: dist.payload.ratchetHeader,
          },
        });
      }
    });

    return { success: true, message: 'Sender keys uploaded' };
  }

  async getSenderKeyDistributions(
    conversationId: string,
    userId: string,
    deviceId: string,
  ) {
    await this.getActiveMember(conversationId, userId);

    const distributions =
      await this.prisma.readDb.senderKeyDistribution.findMany({
        where: {
          conversationId,
          recipientUserId: userId,
          recipientDeviceId: deviceId,
        },
        orderBy: { createdAt: 'asc' },
      });

    return {
      success: true,
      distributions: distributions.map((d) => ({
        id: d.id,
        conversationId: d.conversationId,
        senderUserId: d.senderUserId,
        senderDeviceId: d.senderDeviceId,
        recipientUserId: d.recipientUserId,
        recipientDeviceId: d.recipientDeviceId,
        payload: this.mapCipherPayload(d),
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async getUnreadCounts(userId: string) {
    const memberships = await this.prisma.readDb.conversationMember.findMany({
      where: { userId, leftAt: null, conversation: { isDeleted: false } },
      select: { conversationId: true, unreadCount: true },
    });

    const items = await Promise.all(
      memberships.map(async (m) => {
        const cached = await this.redis.getUnreadCount(
          userId,
          m.conversationId,
        );
        return {
          conversationId: m.conversationId,
          count: cached || m.unreadCount,
        };
      }),
    );

    const totalUnread = items.reduce((sum, item) => sum + item.count, 0);

    return { success: true, items, totalUnread };
  }

  private parseMemberRole(role?: string): MemberRole {
    if (!role) return MemberRole.MEMBER;
    const upper = role.toUpperCase();
    if (upper in MemberRole) {
      return MemberRole[upper as keyof typeof MemberRole];
    }
    throw new RpcException({ code: INVALID_ARGUMENT, message: 'Invalid role' });
  }

  private parseMessageType(type: string): MessageType {
    const upper = type.toUpperCase();
    if (upper in MessageType) {
      return MessageType[upper as keyof typeof MessageType];
    }
    throw new RpcException({
      code: INVALID_ARGUMENT,
      message: 'Invalid message type',
    });
  }

  private parseReceiptStatus(status: string): ReceiptStatus {
    const upper = status.toUpperCase();
    if (upper in ReceiptStatus) {
      return ReceiptStatus[upper as keyof typeof ReceiptStatus];
    }
    throw new RpcException({
      code: INVALID_ARGUMENT,
      message: 'Invalid receipt status',
    });
  }
}
