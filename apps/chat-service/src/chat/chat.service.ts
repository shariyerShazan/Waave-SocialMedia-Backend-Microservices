/* eslint-disable */
// chat/chat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import {
  Conversation,
  ConversationDocument,
  ConversationMemberItem,
} from '../schemas/conversation.schema';
import { ChatRedisService } from '../redis/redis.service';
import { ChatEnrichmentService } from './enrichments/enrichment.service';
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import {
  GroupCreatedEvent,
  GroupMemberAddedEvent,
  GroupMemberLeftEvent,
  GroupMemberRemovedEvent,
  MessageSentEvent,
} from '@app/kafka/constants/events.type';
import { E2eeMemberRole } from '@app/common';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,

    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,

    private redis: ChatRedisService,
    private readonly enrichment: ChatEnrichmentService,
    private readonly kafka: KafkaService,
  ) {}

  private getMemberHelper(
    conversation: ConversationDocument,
    userId: string,
  ): ConversationMemberItem {
    const existing = conversation.members?.find((m) => m.userId === userId);
    if (existing) return existing;

    const isAdmin = conversation.admins?.includes(userId) ?? false;
    return {
      userId,
      role: isAdmin ? 'ADMIN' : 'MEMBER',
      muted: false,
      mutedUntil: null,
      archived: false,
      pinned: false,
      unreadCount: conversation.unreadCounts?.[userId] || 0,
      joinedAt: conversation.createdAt || new Date(),
      leftAt: null,
    };
  }

  // ── Get or Create Direct Conversation ────────────────
  async getOrCreateConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument> {
    const existing = await this.conversationModel.findOne({
      type: 'direct',
      participants: { $all: [userId1, userId2], $size: 2 },
    });

    if (existing) return existing;

    const now = new Date();
    const members: ConversationMemberItem[] = [
      {
        userId: userId1,
        role: 'MEMBER',
        muted: false,
        mutedUntil: null,
        archived: false,
        pinned: false,
        unreadCount: 0,
        joinedAt: now,
        leftAt: null,
      },
      {
        userId: userId2,
        role: 'MEMBER',
        muted: false,
        mutedUntil: null,
        archived: false,
        pinned: false,
        unreadCount: 0,
        joinedAt: now,
        leftAt: null,
      },
    ];

    const conversation = await this.conversationModel.create({
      participants: [userId1, userId2],
      type: 'direct',
      unreadCounts: { [userId1]: 0, [userId2]: 0 },
      members,
    });

    this.logger.log(
      `New conversation: ${conversation.id} [${userId1} ↔ ${userId2}]`,
    );

    return conversation;
  }

  // ── Create Group ──────────────────────────────
  async createGroup(data: {
    name: string;
    creatorId: string;
    participantIds: string[];
    avatar?: string;
  }): Promise<ConversationDocument> {
    const participants = [...new Set([data.creatorId, ...data.participantIds])];

    const unreadCounts: Record<string, number> = {};
    const now = new Date();
    const members: ConversationMemberItem[] = participants.map((id) => {
      unreadCounts[id] = 0;
      return {
        userId: id,
        role: id === data.creatorId ? 'OWNER' : 'MEMBER',
        muted: false,
        mutedUntil: null,
        archived: false,
        pinned: false,
        unreadCount: 0,
        joinedAt: now,
        leftAt: null,
      };
    });

    const group = await this.conversationModel.create({
      type: 'group',
      name: data.name,
      avatar: data.avatar || '',
      participants,
      admins: [data.creatorId],
      unreadCounts,
      members,
    });

    const groupCreateData: GroupCreatedEvent = {
      conversationId: group.id,
      groupName: group.name || 'N/A',
      creatorId: data.creatorId,
      participantIds: participants,
      avatar: group.avatar || 'N/A',
    };
    await this.kafka.emit(KAFKA_TOPICS.GROUP_CREATED, groupCreateData);

    this.logger.log(`Group created: ${group.id} by ${data.creatorId}`);

    return group;
  }

  // ── Get Single Conversation ───────────────────
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: false,
    });

    if (!conversation) throw new Error('Conversation not found');
    return conversation;
  }

  // ── Get Conversations ─────────────────────────
  async getConversations(
    userId: string,
    page: number,
    limit: number,
    archived?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const query: any = {
      participants: userId,
      isDeleted: false,
    };

    if (archived !== undefined) {
      if (archived) {
        query.members = {
          $elemMatch: { userId, archived: true },
        };
      } else {
        query.$or = [
          { members: { $elemMatch: { userId, archived: false } } },
          { 'members.userId': { $ne: userId } },
        ];
      }
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments(query),
    ]);

    const participantIds = [
      ...new Set(
        conversations.flatMap((c) =>
          c.participants.filter((p: string) => p !== userId),
        ),
      ),
    ];

    const onlineSet = await this.redis.getOnlineUsers(participantIds);

    const formatted = await Promise.all(
      conversations.map(async (c) => {
        const otherIds = c.participants.filter((p: string) => p !== userId);
        const memberInfo = c.members?.find((m: any) => m.userId === userId);

        const unread =
          (await this.redis.getUnreadCount(userId, c._id.toString())) ||
          memberInfo?.unreadCount ||
          c.unreadCounts?.[userId] ||
          0;

        return {
          id: c._id.toString(),
          type: c.type,
          name: c.name,
          avatar: c.avatar,
          participants: c.participants,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          lastSenderId: c.lastSenderId,
          unreadCount: unread,
          isOnline: otherIds.some((id: string) => onlineSet.has(id)),
          muted: memberInfo?.muted ?? false,
          archived: memberInfo?.archived ?? false,
          pinned: memberInfo?.pinned ?? false,
        };
      }),
    );

    const enriched = await this.enrichment.enrichConversations(
      formatted,
      userId,
    );
    return {
      conversations: enriched,
      total,
      page,
    };
  }

  // ── Add Group Member ──────────────────────────
  async addGroupMember(
    conversationId: string,
    adminId: string,
    userId: string,
    role = 'MEMBER',
  ) {
    const group = await this.conversationModel.findOne({
      _id: conversationId,
      type: 'group',
      participants: adminId,
    });

    if (!group) throw new Error('Group not found or unauthorized');

    const newMember: ConversationMemberItem = {
      userId,
      role: role || 'MEMBER',
      muted: false,
      mutedUntil: null,
      archived: false,
      pinned: false,
      unreadCount: 0,
      joinedAt: new Date(),
      leftAt: null,
    };

    const updateOps: any = {
      $addToSet: { participants: userId },
      $set: { [`unreadCounts.${userId}`]: 0 },
    };

    if (role === 'ADMIN' || role === 'OWNER') {
      updateOps.$addToSet.admins = userId;
    }

    const existingMember = group.members?.find((m) => m.userId === userId);
    if (!existingMember) {
      updateOps.$push = { members: newMember };
    } else {
      updateOps.$set[`members.$[elem].role`] = role;
      updateOps.$set[`members.$[elem].leftAt`] = null;
    }

    await this.conversationModel.findByIdAndUpdate(conversationId, updateOps, {
      arrayFilters: existingMember ? [{ 'elem.userId': userId }] : undefined,
    });

    const addMemberData: GroupMemberAddedEvent = {
      conversationId,
      groupName: group.name || 'N/A',
      userId,
      addedBy: adminId,
      role: (role as any) || E2eeMemberRole.MEMBER,
    };
    await this.kafka.emit(KAFKA_TOPICS.GROUP_MEMBER_ADDED, addMemberData);
  }

  // ── Remove Group Member ───────────────────────
  async removeGroupMember(
    conversationId: string,
    adminId: string,
    userId: string,
  ) {
    const group = await this.conversationModel.findOne({
      _id: conversationId,
      type: 'group',
      participants: adminId,
    });

    if (!group) throw new Error('Group not found or unauthorized');

    await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $pull: { participants: userId, admins: userId },
        $set: { 'members.$[elem].leftAt': new Date() },
      },
      {
        arrayFilters: [{ 'elem.userId': userId }],
      },
    );

    const removeMemberData: GroupMemberRemovedEvent = {
      conversationId,
      groupName: group.name || 'N/A',
      userId,
      removedBy: adminId,
    };
    await this.kafka.emit(KAFKA_TOPICS.GROUP_MEMBER_REMOVED, removeMemberData);
  }

  // ── Leave Group ───────────────────────────────
  async leaveGroup(conversationId: string, userId: string) {
    const group = await this.conversationModel.findOne({
      _id: conversationId,
      type: 'group',
      participants: userId,
    });

    if (!group) throw new Error('Group not found');

    await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $pull: { participants: userId, admins: userId },
        $set: { 'members.$[elem].leftAt': new Date() },
      },
      {
        arrayFilters: [{ 'elem.userId': userId }],
      },
    );

    const leaveGroupData: GroupMemberLeftEvent = {
      conversationId,
      groupName: group.name || 'N/A',
      userId,
    };
    await this.kafka.emit(KAFKA_TOPICS.GROUP_MEMBER_LEFT, leaveGroupData);
  }

  // ── Update Member Role ────────────────────────
  async updateMemberRole(
    conversationId: string,
    adminId: string,
    userId: string,
    role: string,
  ) {
    const group = await this.conversationModel.findOne({
      _id: conversationId,
      type: 'group',
      participants: adminId,
    });

    if (!group) throw new Error('Group not found or unauthorized');

    const updateOps: any = {
      $set: { 'members.$[elem].role': role },
    };

    if (role === 'ADMIN' || role === 'OWNER') {
      updateOps.$addToSet = { admins: userId };
    } else {
      updateOps.$pull = { admins: userId };
    }

    await this.conversationModel.findByIdAndUpdate(conversationId, updateOps, {
      arrayFilters: [{ 'elem.userId': userId }],
    });
  }

  // ── Mute Conversation ─────────────────────────
  async muteConversation(
    conversationId: string,
    userId: string,
    muted: boolean,
    mutedUntil?: string,
  ) {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) throw new Error('Conversation not found');

    const existingMember = conversation.members?.find(
      (m) => m.userId === userId,
    );
    if (!existingMember) {
      const member = this.getMemberHelper(conversation, userId);
      member.muted = muted;
      member.mutedUntil = mutedUntil ? new Date(mutedUntil) : null;
      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $push: { members: member },
      });
    } else {
      await this.conversationModel.findByIdAndUpdate(
        conversationId,
        {
          $set: {
            'members.$[elem].muted': muted,
            'members.$[elem].mutedUntil': mutedUntil
              ? new Date(mutedUntil)
              : null,
          },
        },
        {
          arrayFilters: [{ 'elem.userId': userId }],
        },
      );
    }
  }

  // ── Archive Conversation ──────────────────────
  async archiveConversation(
    conversationId: string,
    userId: string,
    archived: boolean,
  ) {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) throw new Error('Conversation not found');

    const existingMember = conversation.members?.find(
      (m) => m.userId === userId,
    );
    if (!existingMember) {
      const member = this.getMemberHelper(conversation, userId);
      member.archived = archived;
      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $push: { members: member },
      });
    } else {
      await this.conversationModel.findByIdAndUpdate(
        conversationId,
        {
          $set: { 'members.$[elem].archived': archived },
        },
        {
          arrayFilters: [{ 'elem.userId': userId }],
        },
      );
    }
  }

  // ── Pin Conversation ──────────────────────────
  async pinConversation(
    conversationId: string,
    userId: string,
    pinned: boolean,
  ) {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) throw new Error('Conversation not found');

    const existingMember = conversation.members?.find(
      (m) => m.userId === userId,
    );
    if (!existingMember) {
      const member = this.getMemberHelper(conversation, userId);
      member.pinned = pinned;
      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $push: { members: member },
      });
    } else {
      await this.conversationModel.findByIdAndUpdate(
        conversationId,
        {
          $set: { 'members.$[elem].pinned': pinned },
        },
        {
          arrayFilters: [{ 'elem.userId': userId }],
        },
      );
    }
  }

  // ── Send Message ──────────────────────────────
  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    mediaIds?: string[];
    type?: string;
    replyTo?: string;
    forwardedFromMessageId?: string;
    clientMessageId?: string;
  }): Promise<MessageDocument> {
    const conversation = await this.conversationModel.findById(
      data.conversationId,
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message = await this.messageModel.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar || '',
      text: data.text,
      mediaIds: data.mediaIds || [],
      type: data.type || 'text',
      replyTo: data.replyTo || null,
      forwardedFromMessageId: data.forwardedFromMessageId || null,
      clientMessageId: data.clientMessageId || null,
      readBy: [data.senderId],
    });

    const otherParticipants = conversation.participants.filter(
      (p) => p !== data.senderId,
    );

    const unreadUpdate: Record<string, number> = {};
    otherParticipants.forEach((p) => {
      const current = conversation.unreadCounts?.[p] || 0;
      unreadUpdate[`unreadCounts.${p}`] = current + 1;
    });

    await this.conversationModel.findByIdAndUpdate(data.conversationId, {
      $set: {
        lastMessage: data.text.substring(0, 100),
        lastMessageAt: new Date(),
        lastSenderId: data.senderId,
        ...unreadUpdate,
      },
    });

    await this.redis.invalidateMessageCache(data.conversationId);

    for (const participantId of otherParticipants) {
      const newCount = (conversation.unreadCounts?.[participantId] || 0) + 1;
      await this.redis.setUnreadCount(
        participantId,
        data.conversationId,
        newCount,
      );
    }

    this.logger.debug(`Message sent: ${message.id} in ${data.conversationId}`);

    const messageSentData: MessageSentEvent = {
      conversationId: data.conversationId,
      messageId: message.id,
      senderId: data.senderId,
      messageType: data.type || 'text',
      text: data.text,
    };
    await this.kafka.emit(KAFKA_TOPICS.MESSAGE_SENT, messageSentData);

    const [enriched] = await this.enrichment.enrichMessages([
      message.toObject(),
    ]);

    return enriched;
  }

  // ── Get Messages ──────────────────────────────
  async getMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
    beforeMessageId?: string,
    afterMessageId?: string,
  ) {
    if (page === 1 && !beforeMessageId && !afterMessageId) {
      const cached = await this.redis.getRecentMessages(conversationId);
      if (cached)
        return { messages: cached, total: cached.length, page, hasMore: false };
    }

    const query: any = {
      conversationId,
      isDeleted: false,
      deletedFor: { $ne: userId },
    };

    if (beforeMessageId) {
      const beforeMsg = await this.messageModel.findById(beforeMessageId);
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    } else if (afterMessageId) {
      const afterMsg = await this.messageModel.findById(afterMessageId);
      if (afterMsg) {
        query.createdAt = { $gt: afterMsg.createdAt };
      }
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments(query),
    ]);

    const formatted = messages.reverse().map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderAvatar: m.senderAvatar,
      text: m.text,
      mediaIds: m.mediaIds,
      type: m.type,
      readBy: m.readBy,
      reactions: m.reactions,
      replyTo: m.replyTo,
      forwardedFromMessageId: m.forwardedFromMessageId,
      clientMessageId: m.clientMessageId,
      isDeleted: m.isDeleted,
      isEdited: m.isEdited,
      editedAt: m.editedAt,
      isMine: m.senderId === userId,
      createdAt: m.createdAt,
      isPinned: m.pinnedBy?.includes(userId) ?? false,
    }));

    const enriched = await this.enrichment.enrichMessages(formatted);

    if (page === 1 && !beforeMessageId && !afterMessageId) {
      await this.redis.cacheRecentMessages(conversationId, enriched);
    }

    return {
      messages: enriched,
      total,
      page,
      hasMore: skip + messages.length < total,
    };
  }

  // ── Edit Message ──────────────────────────────
  async editMessage(messageId: string, senderId: string, text: string) {
    const message = await this.messageModel.findOne({
      _id: messageId,
      senderId,
      isDeleted: false,
    });

    if (!message) throw new Error('Message not found or unauthorized');

    const updated = await this.messageModel.findByIdAndUpdate(
      messageId,
      {
        $set: {
          text,
          isEdited: true,
          editedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) throw new Error('Failed to update message');

    await this.redis.invalidateMessageCache(message.conversationId);

    const [enriched] = await this.enrichment.enrichMessages([
      updated.toObject(),
    ]);
    return enriched;
  }

  // ── Delete Message ────────────────────────────
  async deleteMessage(
    messageId: string,
    userId: string,
    forEveryone = false,
  ): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('Message not found');

    if (forEveryone) {
      if (message.senderId !== userId) {
        throw new Error('Unauthorized to delete message for everyone');
      }
      await this.messageModel.findByIdAndUpdate(messageId, {
        $set: {
          isDeleted: true,
          text: 'This message was deleted',
        },
      });
    } else {
      await this.messageModel.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: userId },
      });
    }

    await this.redis.invalidateMessageCache(message.conversationId);
  }

  // ── Forward Message ───────────────────────────
  async forwardMessage(data: {
    sourceMessageId: string;
    targetConversationId: string;
    senderId: string;
  }) {
    const sourceMsg = await this.messageModel.findById(data.sourceMessageId);
    if (!sourceMsg) throw new Error('Source message not found');

    return this.sendMessage({
      conversationId: data.targetConversationId,
      senderId: data.senderId,
      senderName: '',
      senderAvatar: '',
      text: sourceMsg.text,
      mediaIds: sourceMsg.mediaIds,
      type: sourceMsg.type,
      forwardedFromMessageId: sourceMsg._id.toString(),
    });
  }

  // ── Mark Receipt ──────────────────────────────
  async markReceipt(messageId: string, userId: string, status: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('Message not found');

    await this.messageModel.findByIdAndUpdate(messageId, {
      $set: {
        [`receipts.${userId}`]: {
          status,
          updatedAt: new Date(),
        },
      },
    });
  }

  // ── Mark as Read ──────────────────────────────
  async markAsRead(
    conversationId: string,
    userId: string,
    upToMessageId?: string,
  ): Promise<void> {
    const query: any = {
      conversationId,
      readBy: { $ne: userId },
      senderId: { $ne: userId },
      isDeleted: false,
    };

    if (upToMessageId) {
      const upToMsg = await this.messageModel.findById(upToMessageId);
      if (upToMsg) {
        query.createdAt = { $lte: upToMsg.createdAt };
      }
    }

    await this.messageModel.updateMany(query, {
      $addToSet: { readBy: userId },
    });

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    });

    await this.redis.clearUnread(userId, conversationId);
    await this.redis.invalidateMessageCache(conversationId);
  }

  // ── React to Message ──────────────────────────
  async reactToMessage(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<any> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('Message not found');

    const reactions = message.reactions || {};

    if (reactions[emoji]?.includes(userId)) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
      if (!reactions[emoji].length) delete reactions[emoji];
    } else {
      Object.keys(reactions).forEach((e) => {
        reactions[e] = reactions[e].filter((id: string) => id !== userId);
        if (!reactions[e].length) delete reactions[e];
      });
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    const updated = await this.messageModel.findByIdAndUpdate(
      messageId,
      { $set: { reactions } },
      { new: true },
    );

    await this.redis.invalidateMessageCache(message.conversationId);

    return updated;
  }

  // ── Pin Message ───────────────────────────────
  async pinMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    pinned: boolean,
  ) {
    const message = await this.messageModel.findOne({
      _id: messageId,
      conversationId,
    });

    if (!message) throw new Error('Message not found');

    if (pinned) {
      await this.messageModel.findByIdAndUpdate(messageId, {
        $addToSet: { pinnedBy: userId },
      });
    } else {
      await this.messageModel.findByIdAndUpdate(messageId, {
        $pull: { pinnedBy: userId },
      });
    }

    await this.redis.invalidateMessageCache(conversationId);
  }

  // ── Get Unread Counts ─────────────────────────
  async getUnreadCounts(userId: string) {
    const conversations = await this.conversationModel.find({
      participants: userId,
      isDeleted: false,
    });

    let totalUnread = 0;
    const items = await Promise.all(
      conversations.map(async (c) => {
        const count =
          (await this.redis.getUnreadCount(userId, c._id.toString())) ||
          c.unreadCounts?.[userId] ||
          0;
        totalUnread += count;
        return {
          conversationId: c._id.toString(),
          count,
        };
      }),
    );

    return {
      success: true,
      items,
      totalUnread,
    };
  }

  // ── Get Group Members For Notification ───────
  async getGroupMembersForNotif(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      return {
        success: false,
        conversationId,
        groupName: '',
        avatar: '',
        members: [],
      };
    }

    const members = conversation.participants.map((p) => {
      const m = conversation.members?.find((mem) => mem.userId === p);
      return {
        userId: p,
        muted: m?.muted ?? false,
      };
    });

    return {
      success: true,
      conversationId,
      groupName: conversation.name || '',
      avatar: conversation.avatar || '',
      members,
    };
  }
}
