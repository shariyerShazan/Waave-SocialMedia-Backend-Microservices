import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { ChatGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  AddGroupMemberInput,
  ArchiveConversationInput,
  ChatConversationListResponse,
  ChatConversationResponse,
  ChatMessageListResponse,
  ChatMessageResponse,
  CreateGroupInput,
  EditMessageInput,
  ForwardMessageInput,
  GenericChatActionResult,
  MarkConversationReadInput,
  MarkReceiptInput,
  MuteConversationInput,
  PinConversationInput,
  PinMessageInput,
  ReactMessageInput,
  SendMessageInput,
  StartConversationInput,
  UnreadCountsResponse,
  UpdateMemberRoleInput,
} from './dto/chat.graphql.types';

@Resolver()
export class ChatResolver {
  constructor(private readonly chatClient: ChatGrpcClient) {}

  @Query(() => ChatConversationListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  conversations(
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
    @Args('archived', { nullable: true }) archived?: boolean,
  ) {
    return this.chatClient.getConversations({
      userId: ctx.req.user.userId,
      page: page || 1,
      limit: limit || 20,
      archived,
    });
  }

  @Query(() => ChatConversationResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  conversation(@Context() ctx: any, @Args('id') id: string) {
    return this.chatClient.getConversation({
      conversationId: id,
      userId: ctx.req.user.userId,
    });
  }

  @Mutation(() => ChatConversationResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getOrCreateConversation(
    @Context() ctx: any,
    @Args('input') input: StartConversationInput,
  ) {
    return this.chatClient.getOrCreateConversation({
      userId1: ctx.req.user.userId,
      userId2: input.targetUserId,
    });
  }

  @Mutation(() => ChatConversationResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createGroup(@Context() ctx: any, @Args('input') input: CreateGroupInput) {
    return this.chatClient.createGroup({
      name: input.name,
      creatorId: ctx.req.user.userId,
      participantIds: input.participantIds,
      avatar: input.avatar ?? '',
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  addGroupMember(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: AddGroupMemberInput,
  ) {
    return this.chatClient.addGroupMember({
      conversationId: id,
      adminId: ctx.req.user.userId,
      userId: input.userId,
      role: input.role,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  removeGroupMember(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('userId') userId: string,
  ) {
    return this.chatClient.removeGroupMember({
      conversationId: id,
      adminId: ctx.req.user.userId,
      userId,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  leaveGroup(@Context() ctx: any, @Args('id') id: string) {
    return this.chatClient.leaveGroup({
      conversationId: id,
      userId: ctx.req.user.userId,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateMemberRole(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('userId') userId: string,
    @Args('input') input: UpdateMemberRoleInput,
  ) {
    return this.chatClient.updateMemberRole({
      conversationId: id,
      adminId: ctx.req.user.userId,
      userId,
      role: input.role,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  muteConversation(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: MuteConversationInput,
  ) {
    return this.chatClient.muteConversation({
      conversationId: id,
      userId: ctx.req.user.userId,
      muted: input.muted,
      mutedUntil: input.mutedUntil,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  archiveConversation(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: ArchiveConversationInput,
  ) {
    return this.chatClient.archiveConversation({
      conversationId: id,
      userId: ctx.req.user.userId,
      archived: input.archived,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  pinConversation(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: PinConversationInput,
  ) {
    return this.chatClient.pinConversation({
      conversationId: id,
      userId: ctx.req.user.userId,
      pinned: input.pinned,
    });
  }

  @Mutation(() => ChatMessageResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  sendMessage(@Context() ctx: any, @Args('input') input: SendMessageInput) {
    return this.chatClient.sendMessage({
      conversationId: input.conversationId,
      senderId: ctx.req.user.userId,
      senderName: '',
      senderAvatar: '',
      text: input.text,
      mediaIds: input.mediaIds,
      type: input.type,
      replyTo: input.replyTo,
      forwardedFromMessageId: input.forwardedFromMessageId,
      clientMessageId: input.clientMessageId,
    });
  }

  @Query(() => ChatMessageListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  messages(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 50 }) limit?: number,
    @Args('beforeMessageId', { nullable: true }) beforeMessageId?: string,
    @Args('afterMessageId', { nullable: true }) afterMessageId?: string,
  ) {
    return this.chatClient.getMessages({
      conversationId: id,
      userId: ctx.req.user.userId,
      page: page || 1,
      limit: limit || 50,
      beforeMessageId,
      afterMessageId,
    });
  }

  @Mutation(() => ChatMessageResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  editMessage(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: EditMessageInput,
  ) {
    return this.chatClient.editMessage({
      messageId: id,
      senderId: ctx.req.user.userId,
      text: input.text,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMessage(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('forEveryone', { nullable: true, defaultValue: false })
    forEveryone?: boolean,
  ) {
    return this.chatClient.deleteMessage({
      messageId: id,
      userId: ctx.req.user.userId,
      forEveryone: !!forEveryone,
    });
  }

  @Mutation(() => ChatMessageResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  forwardMessage(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: ForwardMessageInput,
  ) {
    return this.chatClient.forwardMessage({
      sourceMessageId: id,
      targetConversationId: input.targetConversationId,
      senderId: ctx.req.user.userId,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markReceipt(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: MarkReceiptInput,
  ) {
    return this.chatClient.markReceipt({
      messageId: id,
      userId: ctx.req.user.userId,
      status: input.status,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markAsRead(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: MarkConversationReadInput,
  ) {
    return this.chatClient.markAsRead({
      conversationId: id,
      userId: ctx.req.user.userId,
      upToMessageId: input.upToMessageId,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  reactToMessage(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('input') input: ReactMessageInput,
  ) {
    return this.chatClient.reactToMessage({
      messageId: id,
      userId: ctx.req.user.userId,
      emoji: input.emoji,
    });
  }

  @Mutation(() => GenericChatActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  pinChatMessage(
    @Context() ctx: any,
    @Args('id') id: string,
    @Args('messageId') messageId: string,
    @Args('input') input: PinMessageInput,
  ) {
    return this.chatClient.pinMessage({
      conversationId: id,
      messageId,
      userId: ctx.req.user.userId,
      pinned: input.pinned,
    });
  }

  @Query(() => UnreadCountsResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  unreadCounts(@Context() ctx: any) {
    return this.chatClient.getUnreadCounts({
      userId: ctx.req.user.userId,
    });
  }
}
