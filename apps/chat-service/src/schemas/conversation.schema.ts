import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ type: [String], required: true, index: true })
  participants: string[]; // userIds

  @Prop({
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
  })
  type: string;

  @Prop({ default: '' })
  name: string; // group chat name

  @Prop({ default: '' })
  avatar: string; // group avatar

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: null })
  lastMessageAt: Date | null;

  @Prop({ default: '' })
  lastSenderId: string;

  @Prop({ type: Object, default: {} })
  unreadCounts: Record<string, number>; // userId → count

  @Prop({ type: [String], default: [] })
  admins: string[]; // group admins

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ participants: 1, type: 1 });
