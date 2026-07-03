import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { EmailService } from '../email/email.service';
import { NotificationService } from './notification.service';
import type {
  SendRegistrationOtpEvent,
  SendResetPassOtpEvent,
  UserFollowEvent,
  UserUnfollowEvent,
} from '@app/kafka/constants/events.type';

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
}
