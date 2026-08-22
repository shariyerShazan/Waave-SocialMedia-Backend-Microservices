import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { NotificationGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  GenericNotificationActionResult,
  NotificationListResponse,
  NotificationPreferencesResponse,
  UpdateNotificationPreferencesInput,
} from './dto/notification.graphql.types';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationClient: NotificationGrpcClient) {}

  @Query(() => NotificationListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  notifications(
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.notificationClient.getNotifications(
      ctx.req.user?.userId,
      page || 1,
      limit || 20,
    );
  }

  @Mutation(() => GenericNotificationActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  markNotificationAsRead(
    @Context() ctx: any,
    @Args('id') id: string,
  ) {
    return this.notificationClient.markAsRead(ctx.req.user?.userId, id);
  }

  @Mutation(() => GenericNotificationActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  markAllNotificationsAsRead(@Context() ctx: any) {
    return this.notificationClient.markAllAsRead(ctx.req.user?.userId);
  }

  @Mutation(() => GenericNotificationActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteNotification(
    @Context() ctx: any,
    @Args('id') id: string,
  ) {
    return this.notificationClient.deleteNotification(ctx.req.user?.userId, id);
  }

  @Query(() => NotificationPreferencesResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  notificationPreferences(@Context() ctx: any) {
    return this.notificationClient.getPreferences(ctx.req.user?.userId);
  }

  @Mutation(() => NotificationPreferencesResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateNotificationPreferences(
    @Context() ctx: any,
    @Args('input') input: UpdateNotificationPreferencesInput,
  ) {
    return this.notificationClient.updatePreferences(
      ctx.req.user?.userId,
      input,
    );
  }
}
