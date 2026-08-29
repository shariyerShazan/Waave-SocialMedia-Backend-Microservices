import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';

import type {
  GroupCreatedEvent,
  GroupMemberAddedEvent,
  GroupMemberLeftEvent,
  GroupMemberRemovedEvent,
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
import { E2eeChatGrpcClient } from '@app/clients';

@Controller()
export class NotificationConsumer {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly e2eeChatClient: E2eeChatGrpcClient,
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
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: UserRegisteredEvent) {
    try {
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
    } catch (error) {
      console.error('Failed to send notification for register', error);
      throw error;
    }
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
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_FOLLOWED)
  async handleFollow(@Payload() data: UserFollowEvent) {
    try {
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
    } catch (err) {
      console.error('Failed to send follow notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_UNFOLLOWED)
  async handleUnfollow(@Payload() data: UserUnfollowEvent) {
    try {
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
    } catch (err) {
      console.error('Failed to send unfollow notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.POST_LIKED)
  async handlePostLiked(@Payload() data: PostLikedEvent) {
    try {
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
    } catch (err) {
      console.error('Failed to send like notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.POST_COMMENTED)
  async handlePostCommented(@Payload() data: PostCommentEvent) {
    try {
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
    } catch (err) {
      console.error('Failed to send comment notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.POST_SHARED)
  async handlePostShared(@Payload() data: PostSharedEvent) {
    try {
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
    } catch (err) {
      console.error('Failed to send share notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.GROUP_CREATED)
  async handleGroupCreated(@Payload() data: GroupCreatedEvent) {
    try {
      for (const userId of data.participantIds) {
        await this.notificationService.create({
          type: 'group_invite',
          toUserId: userId,
          fromUserId: data.creatorId,
          fromUserName: 'Someone',
          fromUserAvatar: data.avatar || '',
          data: {
            conversationId: data.conversationId,
            groupName: data.groupName,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send group created notification', err);
      throw err;
    }
  }
  @EventPattern(KAFKA_TOPICS.GROUP_MEMBER_ADDED)
  async handleGroupMemberAdded(@Payload() data: GroupMemberAddedEvent) {
    try {
      const members = await this.e2eeChatClient.getGroupMembersForNotif({
        conversationId: data.conversationId,
      });

      for (const member of members.members) {
        if (member.muted) continue;

        await this.notificationService.create({
          type: 'group_member_added',
          toUserId: member.userId,
          fromUserId: data.addedBy,
          fromUserName: 'Someone',
          fromUserAvatar: '',
          data: {
            conversationId: data.conversationId,
            groupName: data.groupName,
            addedUserId: data.userId,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send group member added notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.GROUP_MEMBER_REMOVED)
  async handleGroupMemberRemoved(@Payload() data: GroupMemberRemovedEvent) {
    try {
      const members = await this.e2eeChatClient.getGroupMembersForNotif({
        conversationId: data.conversationId,
      });

      for (const member of members.members) {
        if (member.muted) continue;

        await this.notificationService.create({
          type: 'group_member_removed',
          toUserId: member.userId,
          fromUserId: data.removedBy,
          fromUserName: 'Someone',
          fromUserAvatar: '',
          data: {
            conversationId: data.conversationId,
            groupName: data.groupName,
            removedUserId: data.userId,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send group member removed notification', err);
      throw err;
    }
  }

  @EventPattern(KAFKA_TOPICS.GROUP_MEMBER_LEFT)
  async handleGroupMemberLeft(@Payload() data: GroupMemberLeftEvent) {
    try {
      const members = await this.e2eeChatClient.getGroupMembersForNotif({
        conversationId: data.conversationId,
      });

      for (const member of members.members) {
        if (member.muted) continue;

        await this.notificationService.create({
          type: 'group_member_left',
          toUserId: member.userId,
          fromUserId: data.userId,
          fromUserName: 'Someone',
          fromUserAvatar: '',
          data: {
            conversationId: data.conversationId,
            groupName: data.groupName,
            leftUserId: data.userId,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send group member left notification', err);
      throw err;
    }
  }
}
