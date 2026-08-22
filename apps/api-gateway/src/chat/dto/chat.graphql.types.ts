import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatParticipantType {
  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  joinedAt?: string;
}

@ObjectType()
export class ChatMessageType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  conversationId?: string;

  @Field({ nullable: true })
  senderId?: string;

  @Field({ nullable: true })
  text?: string;

  @Field(() => [String], { nullable: true })
  mediaIds?: string[];

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  replyTo?: string;

  @Field({ nullable: true })
  createdAt?: string;

  @Field({ nullable: true })
  updatedAt?: string;

  @Field({ nullable: true })
  isEdited?: boolean;
}

@ObjectType()
export class ChatConversationType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  isGroup?: boolean;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => [ChatParticipantType], { nullable: true })
  participants?: ChatParticipantType[];

  @Field(() => ChatMessageType, { nullable: true })
  lastMessage?: ChatMessageType;

  @Field(() => Int, { nullable: true })
  unreadCount?: number;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class ChatConversationResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => ChatConversationType, { nullable: true })
  conversation?: ChatConversationType;
}

@ObjectType()
export class ChatConversationListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [ChatConversationType], { nullable: true })
  conversations?: ChatConversationType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class ChatMessageResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => ChatMessageType, { nullable: true })
  chatMessage?: ChatMessageType;
}

@ObjectType()
export class ChatMessageListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [ChatMessageType], { nullable: true })
  messages?: ChatMessageType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class GenericChatActionResult {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class UnreadCountsResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => Int, { nullable: true })
  totalUnread?: number;
}

@InputType()
export class StartConversationInput {
  @Field()
  targetUserId!: string;
}

@InputType()
export class CreateGroupInput {
  @Field()
  name!: string;

  @Field(() => [String])
  participantIds!: string[];

  @Field({ nullable: true })
  avatar?: string;
}

@InputType()
export class AddGroupMemberInput {
  @Field()
  userId!: string;

  @Field({ nullable: true })
  role?: string;
}

@InputType()
export class UpdateMemberRoleInput {
  @Field()
  role!: string;
}

@InputType()
export class MuteConversationInput {
  @Field()
  muted!: boolean;

  @Field({ nullable: true })
  mutedUntil?: string;
}

@InputType()
export class ArchiveConversationInput {
  @Field()
  archived!: boolean;
}

@InputType()
export class PinConversationInput {
  @Field()
  pinned!: boolean;
}

@InputType()
export class SendMessageInput {
  @Field()
  conversationId!: string;

  @Field()
  text!: string;

  @Field(() => [String], { nullable: true })
  mediaIds?: string[];

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  replyTo?: string;

  @Field({ nullable: true })
  forwardedFromMessageId?: string;

  @Field({ nullable: true })
  clientMessageId?: string;
}

@InputType()
export class EditMessageInput {
  @Field()
  text!: string;
}

@InputType()
export class ForwardMessageInput {
  @Field()
  targetConversationId!: string;
}

@InputType()
export class MarkReceiptInput {
  @Field()
  status!: string;
}

@InputType()
export class MarkConversationReadInput {
  @Field({ nullable: true })
  upToMessageId?: string;
}

@InputType()
export class ReactMessageInput {
  @Field()
  emoji!: string;
}

@InputType()
export class PinMessageInput {
  @Field()
  pinned!: boolean;
}
