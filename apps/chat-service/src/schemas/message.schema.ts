import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ default: '' })
  senderAvatar: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [String], default: [] })
  mediaIds: string[];

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'gif'],
    default: 'text',
  })
  type: string;

  @Prop({ type: [String], default: [] })
  readBy: string[];

  @Prop({ type: Object, default: {} })
  reactions: Record<string, string[]>;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  replyTo: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ readBy: 1 });
