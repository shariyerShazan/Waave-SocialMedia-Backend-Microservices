import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PreferenceDocument = NotificationPreference & Document;

@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreference {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ default: true }) likes: boolean;
  @Prop({ default: true }) comments: boolean;
  @Prop({ default: true }) follows: boolean;
  @Prop({ default: true }) unfollows: boolean;
  @Prop({ default: true }) messages: boolean;
  @Prop({ default: true }) mentions: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);
