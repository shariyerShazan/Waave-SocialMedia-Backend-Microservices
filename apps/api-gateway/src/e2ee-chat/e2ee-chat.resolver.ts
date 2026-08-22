import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { E2eeChatGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  CreateE2eeConversationInput,
  E2eeConversationListResponse,
  E2eeConversationResponse,
  E2eeMessageListResponse,
  E2eeMessageResponse,
  SendEncryptedMessageInput,
} from './dto/e2ee-chat.graphql.types';

@Resolver()
export class E2eeChatResolver {
  constructor(private readonly e2eeChatClient: E2eeChatGrpcClient) {}

  @Query(() => E2eeConversationListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  e2eeConversations(
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.e2eeChatClient.getConversations({
      userId: ctx.req.user.userId,
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Mutation(() => E2eeConversationResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createE2eeConversation(
    @Context() ctx: any,
    @Args('input') input: CreateE2eeConversationInput,
  ) {
    return this.e2eeChatClient.getOrCreateDirectConversation({
      userId: ctx.req.user.userId,
      targetUserId: input.targetUserId,
    });
  }

  @Mutation(() => E2eeMessageResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  sendEncryptedMessage(
    @Context() ctx: any,
    @Args('input') input: SendEncryptedMessageInput,
  ) {
    return this.e2eeChatClient.sendEncryptedMessage({
      conversationId: input.conversationId,
      senderId: ctx.req.user.userId,
      senderDeviceId: input.senderDeviceId || ctx.req.user.deviceId || '',
      type: input.type || 'text',
      envelopes: input.envelopes.map((env) => ({
        recipientUserId: env.recipientUserId,
        recipientDeviceId: env.recipientDeviceId,
        payload: {
          ciphertext: env.payload.ciphertext,
          iv: env.payload.iv || '',
          authTag: env.payload.authTag || '',
          ratchetHeader: env.payload.ratchetHeader,
          ephemeralKey: env.payload.ephemeralKey,
          oneTimePreKeyId: env.payload.oneTimePreKeyId,
          signedPreKeyId: env.payload.signedPreKeyId,
        },
      })),
      attachments: [],
    });
  }

  @Query(() => E2eeMessageListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  e2eeMessages(
    @Context() ctx: any,
    @Args('conversationId') conversationId: string,
    @Args('deviceId', { nullable: true }) deviceId?: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 50 }) limit?: number,
  ) {
    return this.e2eeChatClient.getMessages({
      conversationId,
      userId: ctx.req.user.userId,
      deviceId: deviceId || ctx.req.user.deviceId || '',
      page: page || 1,
      limit: limit || 50,
    });
  }
}
