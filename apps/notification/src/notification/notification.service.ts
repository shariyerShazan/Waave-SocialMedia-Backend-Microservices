/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import {
  NotificationPreference,
  PreferenceDocument,
} from '../schemas/notification-preference.schema';
import { getTemplate } from '../templates/notification.templates';
import { NotificationRedisService } from '../redis/redis.service';

export interface CreateNotificationDto {
  type: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  data: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private notifModel: Model<NotificationDocument>,

    @InjectModel(NotificationPreference.name)
    private prefModel: Model<PreferenceDocument>,

    private redis: NotificationRedisService,
    // private fcm: FcmService,
  ) {}

  // ── Create & Send Notification ────────────────
  async create(dto: CreateNotificationDto): Promise<void> {
    if (dto.toUserId === dto.fromUserId) return;

    // Preference check
    const allowed = await this.checkPreference(dto.toUserId, dto.type);
    if (!allowed) return;

    // Duplicate check (1 hour window)
    const refId = dto.data?.postId || dto.data?.commentId || '';
    const isDup = await this.redis.isDuplicate(
      dto.toUserId,
      dto.type,
      `${dto.fromUserId}:${refId}`,
    );
    if (isDup) {
      this.logger.debug(`Duplicate notification skipped: ${dto.type}`);
      return;
    }

    const template = getTemplate(dto.type, {
      ...dto.data,
      fromUserName: dto.fromUserName,
    });

    const notification = await this.notifModel.create({
      toUserId: dto.toUserId,
      fromUserId: dto.fromUserId,
      fromUserName: dto.fromUserName,
      fromUserAvatar: dto.fromUserAvatar,
      type: dto.type,
      title: template.title,
      body: template.body,
      data: dto.data,
    });

    // Unread count increment
    const unreadCount = await this.redis.incrementUnread(dto.toUserId);

    const formatted = this.formatNotification(notification);

    await this.redis.publishToSocket(dto.toUserId, {
      ...formatted,
      unreadCount,
    });

    this.logger.log(`Notification created: ${dto.type} → ${dto.toUserId}`);
  }

  // ── Get Notifications ─────────────────────────
  async getNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notifModel
        .find({ toUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notifModel.countDocuments({ toUserId: userId }),
      this.redis.getUnreadCount(userId),
    ]);

    return {
      notifications: notifications.map((n) => this.formatNotification(n)),
      total,
      unreadCount,
      page,
    };
  }

  // ── Mark as Read ──────────────────────────────
  async markAsRead(userId: string, notificationId: string) {
    await this.notifModel.findOneAndUpdate(
      { _id: notificationId, toUserId: userId },
      { $set: { isRead: true } },
    );

    await this.redis.decrementUnread(userId);
  }

  // ── Mark All as Read ──────────────────────────
  async markAllAsRead(userId: string) {
    await this.notifModel.updateMany(
      { toUserId: userId, isRead: false },
      { $set: { isRead: true } },
    );

    await this.redis.resetUnreadCount(userId);
  }

  // ── Delete Notification ───────────────────────
  async deleteNotification(userId: string, notificationId: string) {
    const notif = await this.notifModel.findOneAndDelete({
      _id: notificationId,
      toUserId: userId,
    });

    if (notif && !notif.isRead) {
      await this.redis.decrementUnread(userId);
    }
  }

  // ── Preferences ───────────────────────────────
  async getPreferences(userId: string) {
    let pref = await this.prefModel.findOne({ userId });
    if (!pref) {
      pref = await this.prefModel.create({ userId });
    }
    return pref;
  }

  async updatePreferences(
    userId: string,
    data: Partial<NotificationPreference>,
  ) {
    return this.prefModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  // ── Private Helpers ───────────────────────────
  private async checkPreference(
    userId: string,
    type: string,
  ): Promise<boolean> {
    const pref = await this.prefModel.findOne({ userId });
    if (!pref) return true;

    const map: Record<string, keyof NotificationPreference> = {
      like: 'likes',
      comment: 'comments',
      follow: 'follows',
      unfollow: 'unfollows',
      message: 'messages',
      mention: 'mentions',
    };

    const field = map[type];
    return field ? ((pref[field] as boolean) ?? true) : true;
  }

  private formatNotification(n: any) {
    return {
      id: n._id?.toString() || n.id,
      toUserId: n.toUserId,
      fromUserId: n.fromUserId,
      fromUserName: n.fromUserName,
      fromUserAvatar: n.fromUserAvatar,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  }
}
