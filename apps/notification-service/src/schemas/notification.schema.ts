// schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true })
  toUserId: string;

  @Prop({ required: true })
  fromUserId: string;

  @Prop({ default: '' })
  fromUserName: string;

  @Prop({ default: '' })
  fromUserAvatar: string;

  @Prop({
    type: String,
    enum: [
      'like',
      'comment',
      'follow',
      'unfollow',
      'mention',
      'share',
      'message',
      'group_invite',
      'post_tag',
      'birthday',
      'system',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ default: false })
  isPushed: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ toUserId: 1, createdAt: -1 });
NotificationSchema.index({ toUserId: 1, isRead: 1 });
