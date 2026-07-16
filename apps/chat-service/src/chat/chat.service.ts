// chat/chat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import {
  Conversation,
  ConversationDocument,
} from '../schemas/conversation.schema';
import { ChatRedisService } from '../redis/redis.service';
import { ChatEnrichmentService } from './enrichments/enrichment.service';

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
  ) {}

  // ── Get or Create Conversation ────────────────
  async getOrCreateConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument> {
    // Existing direct conversation খোঁজো
    const existing = await this.conversationModel.findOne({
      type: 'direct',
      participants: { $all: [userId1, userId2], $size: 2 },
    });

    if (existing) return existing;

    const conversation = await this.conversationModel.create({
      participants: [userId1, userId2],
      type: 'direct',
      unreadCounts: { [userId1]: 0, [userId2]: 0 },
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
    participants.forEach((id) => (unreadCounts[id] = 0));

    const group = await this.conversationModel.create({
      type: 'group',
      name: data.name,
      avatar: data.avatar || '',
      participants,
      admins: [data.creatorId],
      unreadCounts,
    });

    this.logger.log(`Group created: ${group.id} by ${data.creatorId}`);

    return group;
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
  }): Promise<MessageDocument> {
    // Conversation exists?
    const conversation = await this.conversationModel.findById(
      data.conversationId,
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Message create
    const message = await this.messageModel.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar || '',
      text: data.text,
      mediaIds: data.mediaIds || [],
      type: data.type || 'text',
      replyTo: data.replyTo || null,
      readBy: [data.senderId],
    });

    // Conversation update — last message
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

    // Cache invalidate
    await this.redis.invalidateMessageCache(data.conversationId);

    // Unread count cache update
    for (const participantId of otherParticipants) {
      const newCount = (conversation.unreadCounts?.[participantId] || 0) + 1;
      await this.redis.setUnreadCount(
        participantId,
        data.conversationId,
        newCount,
      );
    }

    this.logger.debug(`Message sent: ${message.id} in ${data.conversationId}`);

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
  ) {
    if (page === 1) {
      const cached = await this.redis.getRecentMessages(conversationId);
      if (cached) return { messages: cached, total: cached.length, page };
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({
        conversationId,
        isDeleted: false,
      }),
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
      isDeleted: m.isDeleted,
      isMine: m.senderId === userId,
      createdAt: m.createdAt,
    }));

    // Page 1 cache
    const enriched = await this.enrichment.enrichMessages(formatted);

    if (page === 1) {
      await this.redis.cacheRecentMessages(conversationId, enriched);
    }
    return {
      messages: enriched,
      total,
      page,
    };
  }

  // ── Mark as Read ──────────────────────────────
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        conversationId,
        readBy: { $ne: userId },
        senderId: { $ne: userId },
        isDeleted: false,
      },
      { $addToSet: { readBy: userId } },
    );

    // Conversation unread count reset
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    });

    // Redis unread cache clear
    await this.redis.clearUnread(userId, conversationId);
    await this.redis.invalidateMessageCache(conversationId);
  }

  // ── Delete Message ────────────────────────────
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findOne({
      _id: messageId,
      senderId: userId,
    });

    if (!message) throw new Error('Message not found');

    await this.messageModel.findByIdAndUpdate(messageId, {
      $set: {
        isDeleted: true,
        text: 'This message was deleted',
      },
    });

    await this.redis.invalidateMessageCache(message.conversationId);
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

    // Toggle reaction
    if (reactions[emoji]?.includes(userId)) {
      // Remove
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

  // ── Get Conversations ─────────────────────────
  async getConversations(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({
          participants: userId,
          isDeleted: false,
        })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments({
        participants: userId,
        isDeleted: false,
      }),
    ]);

    // Online status check
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

        const unread =
          (await this.redis.getUnreadCount(userId, c._id.toString())) ||
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
  ) {
    const group = await this.conversationModel.findOne({
      _id: conversationId,
      type: 'group',
      admins: adminId,
    });

    if (!group) throw new Error('Group not found or unauthorized');

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $addToSet: { participants: userId },
      $set: { [`unreadCounts.${userId}`]: 0 },
    });
  }
}
