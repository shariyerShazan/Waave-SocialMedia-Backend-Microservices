import { NotificationConsumer } from '../notification.consumer';
import { EmailService } from '../../../email/email.service';
import { NotificationService } from '../../notification.service';
import { E2eeChatGrpcClient } from '@app/clients';

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;
  let mockEmailService: any;
  let mockNotificationService: any;
  let mockE2eeChatClient: any;

  beforeEach(() => {
    mockEmailService = {
      sendRegistrationOtp: jest.fn().mockResolvedValue(undefined),
      sendForgotPasswordOtp: jest.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    mockE2eeChatClient = {
      getGroupMembersForNotif: jest.fn().mockResolvedValue({
        members: [
          { userId: 'member-1', muted: false },
          { userId: 'member-2', muted: true },
        ],
      }),
    };

    consumer = new NotificationConsumer(
      mockEmailService as EmailService,
      mockNotificationService as NotificationService,
      mockE2eeChatClient as E2eeChatGrpcClient,
    );

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleSendRegistrationOtp', () => {
    it('should call emailService.sendRegistrationOtp with correct args', async () => {
      const data = { email: 'test@example.com', name: 'User', otp: '1234' };
      await consumer.handleSendRegistrationOtp(data);

      expect(mockEmailService.sendRegistrationOtp).toHaveBeenCalledWith(data);
    });

    it('should catch and rethrow error if email sending fails', async () => {
      mockEmailService.sendRegistrationOtp.mockRejectedValueOnce(
        new Error('SMTP Error'),
      );

      await expect(
        consumer.handleSendRegistrationOtp({
          email: 'a@b.com',
          name: 'A',
          otp: '1',
        } as any),
      ).rejects.toThrow('SMTP Error');
    });
  });

  describe('handleUserRegistered', () => {
    it('should call notificationService.create with system notification', async () => {
      const data = { userId: 'u1', name: 'John Doe', email: 'j@d.com' };
      await consumer.handleUserRegistered(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'system',
        toUserId: 'u1',
        fromUserId: 'system',
        fromUserName: 'Waave',
        fromUserAvatar: '',
        data: {
          title: 'Welcome to Waave!',
          body: 'Welcome John Doe! Your account has been created successfully.',
        },
      });
    });

    it('should catch and rethrow error if creation fails', async () => {
      mockNotificationService.create.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        consumer.handleUserRegistered({ userId: 'u1', name: 'John' } as any),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('handleForgotPassword', () => {
    it('should call emailService.sendForgotPasswordOtp', async () => {
      const data = {
        email: 'reset@example.com',
        name: 'Reset User',
        otp: '9999',
      };
      await consumer.handleForgotPassword(data);

      expect(mockEmailService.sendForgotPasswordOtp).toHaveBeenCalledWith(data);
    });

    it('should catch and rethrow error if sending fails', async () => {
      mockEmailService.sendForgotPasswordOtp.mockRejectedValueOnce(
        new Error('Fail'),
      );

      await expect(
        consumer.handleForgotPassword({
          email: 'r@e.com',
          name: 'R',
          otp: '1',
        } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handleFollow', () => {
    it('should call notificationService.create with follow notification', async () => {
      const data = { targetId: 'u2', followerId: 'u1', followerName: 'Alice' };
      await consumer.handleFollow(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'follow',
        toUserId: 'u2',
        fromUserId: 'u1',
        fromUserName: 'Alice',
        fromUserAvatar: '',
        data: {
          followerId: 'u1',
          fromUserName: 'Alice',
        },
      });
    });

    it('should fall back to default followerName "Someone" if followerName is missing', async () => {
      const data = { targetId: 'u2', followerId: 'u1' };
      await consumer.handleFollow(data as any);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUserName: 'Someone',
        }),
      );
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handleFollow({ targetId: 't', followerId: 'f' } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handleUnfollow', () => {
    it('should call notificationService.create with unfollow notification', async () => {
      const data = { targetId: 'u2', followerId: 'u1', followerName: 'Bob' };
      await consumer.handleUnfollow(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'unfollow',
        toUserId: 'u2',
        fromUserId: 'u1',
        fromUserName: 'Bob',
        fromUserAvatar: '',
        data: {
          followerId: 'u1',
          fromUserName: 'Bob',
        },
      });
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handleUnfollow({ targetId: 't', followerId: 'f' } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handlePostLiked', () => {
    it('should call notificationService.create with like notification', async () => {
      const data = { authorId: 'u2', userId: 'u1', postId: 'p1' };
      await consumer.handlePostLiked(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'like',
        toUserId: 'u2',
        fromUserId: 'u1',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: { postId: 'p1' },
      });
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handlePostLiked({
          authorId: 'a',
          userId: 'u',
          postId: 'p',
        } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handlePostCommented', () => {
    it('should call notificationService.create with comment notification', async () => {
      const data = {
        authorId: 'u2',
        userId: 'u1',
        postId: 'p1',
        commentId: 'c1',
        text: 'Great post',
        parentId: 'c0',
      };
      await consumer.handlePostCommented(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'comment',
        toUserId: 'u2',
        fromUserId: 'u1',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: {
          postId: 'p1',
          commentId: 'c1',
          text: 'Great post',
          parentId: 'c0',
        },
      });
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handlePostCommented({
          authorId: 'a',
          userId: 'u',
          postId: 'p',
        } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handlePostShared', () => {
    it('should call notificationService.create with share notification', async () => {
      const data = {
        authorId: 'u2',
        userId: 'u1',
        postId: 'p1',
        shareId: 's1',
      };
      await consumer.handlePostShared(data);

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'share',
        toUserId: 'u2',
        fromUserId: 'u1',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: { postId: 'p1', shareId: 's1' },
      });
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handlePostShared({
          authorId: 'a',
          userId: 'u',
          postId: 'p',
          shareId: 's',
        } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handleGroupCreated', () => {
    it('should create notifications for all participants in the group', async () => {
      const data = {
        participantIds: ['u1', 'u2'],
        creatorId: 'creator-1',
        avatar: 'group.png',
        conversationId: 'conv-1',
        groupName: 'Designers',
      };

      await consumer.handleGroupCreated(data);

      expect(mockNotificationService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.create).toHaveBeenNthCalledWith(1, {
        type: 'group_invite',
        toUserId: 'u1',
        fromUserId: 'creator-1',
        fromUserName: 'Someone',
        fromUserAvatar: 'group.png',
        data: { conversationId: 'conv-1', groupName: 'Designers' },
      });
      expect(mockNotificationService.create).toHaveBeenNthCalledWith(2, {
        type: 'group_invite',
        toUserId: 'u2',
        fromUserId: 'creator-1',
        fromUserName: 'Someone',
        fromUserAvatar: 'group.png',
        data: { conversationId: 'conv-1', groupName: 'Designers' },
      });
    });

    it('should catch and rethrow error', async () => {
      mockNotificationService.create.mockRejectedValueOnce(new Error('Fail'));
      await expect(
        consumer.handleGroupCreated({ participantIds: ['u1'] } as any),
      ).rejects.toThrow('Fail');
    });
  });

  describe('handleGroupMemberAdded', () => {
    it('should fetch members and notify non-muted members', async () => {
      const data = {
        conversationId: 'conv-1',
        addedBy: 'admin-1',
        userId: 'new-user',
        groupName: 'Devs',
      };

      await consumer.handleGroupMemberAdded(data as any);

      expect(mockE2eeChatClient.getGroupMembersForNotif).toHaveBeenCalledWith({
        conversationId: 'conv-1',
      });
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'group_member_added',
        toUserId: 'member-1',
        fromUserId: 'admin-1',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: {
          conversationId: 'conv-1',
          groupName: 'Devs',
          addedUserId: 'new-user',
        },
      });
    });

    it('should catch and rethrow error', async () => {
      mockE2eeChatClient.getGroupMembersForNotif.mockRejectedValueOnce(
        new Error('gRPC error'),
      );

      await expect(
        consumer.handleGroupMemberAdded({ conversationId: 'conv-1' } as any),
      ).rejects.toThrow('gRPC error');
    });
  });

  describe('handleGroupMemberRemoved', () => {
    it('should fetch members and notify non-muted members', async () => {
      const data = {
        conversationId: 'conv-1',
        removedBy: 'admin-1',
        userId: 'removed-user',
        groupName: 'Devs',
      };

      await consumer.handleGroupMemberRemoved(data);

      expect(mockE2eeChatClient.getGroupMembersForNotif).toHaveBeenCalledWith({
        conversationId: 'conv-1',
      });
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'group_member_removed',
        toUserId: 'member-1',
        fromUserId: 'admin-1',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: {
          conversationId: 'conv-1',
          groupName: 'Devs',
          removedUserId: 'removed-user',
        },
      });
    });

    it('should catch and rethrow error', async () => {
      mockE2eeChatClient.getGroupMembersForNotif.mockRejectedValueOnce(
        new Error('gRPC error'),
      );

      await expect(
        consumer.handleGroupMemberRemoved({ conversationId: 'conv-1' } as any),
      ).rejects.toThrow('gRPC error');
    });
  });

  describe('handleGroupMemberLeft', () => {
    it('should fetch members and notify non-muted members', async () => {
      const data = {
        conversationId: 'conv-1',
        userId: 'left-user',
        groupName: 'Devs',
      };

      await consumer.handleGroupMemberLeft(data);

      expect(mockE2eeChatClient.getGroupMembersForNotif).toHaveBeenCalledWith({
        conversationId: 'conv-1',
      });
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'group_member_left',
        toUserId: 'member-1',
        fromUserId: 'left-user',
        fromUserName: 'Someone',
        fromUserAvatar: '',
        data: {
          conversationId: 'conv-1',
          groupName: 'Devs',
          leftUserId: 'left-user',
        },
      });
    });

    it('should catch and rethrow error', async () => {
      mockE2eeChatClient.getGroupMembersForNotif.mockRejectedValueOnce(
        new Error('gRPC error'),
      );

      await expect(
        consumer.handleGroupMemberLeft({ conversationId: 'conv-1' } as any),
      ).rejects.toThrow('gRPC error');
    });
  });
});
