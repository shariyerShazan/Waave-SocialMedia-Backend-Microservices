import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';

import type {
  PostCommentEvent,
  PostLikedEvent,
  PostSharedEvent,
  SendRegistrationOtpEvent,
  SendResetPassOtpEvent,
  UserFollowEvent,
  UserRegisteredEvent,
  UserUnfollowEvent,
} from '@app/kafka/constants/events.type';
import { EmailService } from '../../email/email.service';
import { NotificationService } from '../notification.service';

@Controller()
export class NotificationConsumer {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  @EventPattern(KAFKA_TOPICS.SEND_REGISTRATION_OTP)
  async handleSendRegistrationOtp(@Payload() data: SendRegistrationOtpEvent) {
    try {
      await this.emailService.sendRegistrationOtp({
        email: data.email,
        name: data.name,
        otp: data.otp,
      });
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: UserRegisteredEvent) {
    await this.notificationService.create({
      type: 'system',
      toUserId: data.userId,
      fromUserId: 'system',
      fromUserName: 'Waave',
      fromUserAvatar: '',
      data: {
        title: 'Welcome to Waave!',
        body: `Welcome ${data.name}! Your account has been created successfully.`,
      },
    });
  }

  @EventPattern(KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST)
  async handleForgotPassword(@Payload() data: SendResetPassOtpEvent) {
    try {
      await this.emailService.sendForgotPasswordOtp({
        email: data.email,
        name: data.name,
        otp: data.otp,
      });
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_FOLLOWED)
  async handleFollow(@Payload() data: UserFollowEvent) {
    await this.notificationService.create({
      type: 'follow',
      toUserId: data.targetId,
      fromUserId: data.followerId,
      fromUserName: data.followerName || 'Someone',
      fromUserAvatar: '',
      data: {
        followerId: data.followerId,
        fromUserName: data.followerName,
      },
    });
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_UNFOLLOWED)
  async handleUnfollow(@Payload() data: UserUnfollowEvent) {
    await this.notificationService.create({
      type: 'unfollow',
      toUserId: data.targetId,
      fromUserId: data.followerId,
      fromUserName: data.followerName || 'Someone',
      fromUserAvatar: '',
      data: {
        followerId: data.followerId,
        fromUserName: data.followerName,
      },
    });
  }

  @EventPattern(KAFKA_TOPICS.POST_LIKED)
  async handlePostLiked(@Payload() data: PostLikedEvent) {
    await this.notificationService.create({
      type: 'like',
      toUserId: data.authorId,
      fromUserId: data.userId,
      fromUserName: 'Someone',
      fromUserAvatar: '',
      data: {
        postId: data.postId,
      },
    });
  }

  @EventPattern(KAFKA_TOPICS.POST_COMMENTED)
  async handlePostCommented(@Payload() data: PostCommentEvent) {
    await this.notificationService.create({
      type: 'comment',
      toUserId: data.authorId,
      fromUserId: data.userId,
      fromUserName: 'Someone',
      fromUserAvatar: '',
      data: {
        postId: data.postId,
        commentId: data.commentId,
        text: data.text,
        parentId: data.parentId,
      },
    });
  }

  @EventPattern(KAFKA_TOPICS.POST_SHARED)
  async handlePostShared(@Payload() data: PostSharedEvent) {
    await this.notificationService.create({
      type: 'share',
      toUserId: data.authorId,
      fromUserId: data.userId,
      fromUserName: 'Someone',
      fromUserAvatar: '',
      data: {
        postId: data.postId,
        shareId: data.shareId,
      },
    });
  }
}
