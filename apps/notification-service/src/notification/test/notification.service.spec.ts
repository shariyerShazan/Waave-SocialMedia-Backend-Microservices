import {
  NotificationService,
  CreateNotificationDto,
} from '../notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotifModel: any;
  let mockPrefModel: any;
  let mockRedisService: any;

  beforeEach(() => {
    mockNotifModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    mockPrefModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    mockRedisService = {
      isDuplicate: jest.fn().mockResolvedValue(false),
      incrementUnread: jest.fn().mockResolvedValue(1),
      getUnreadCount: jest.fn().mockResolvedValue(1),
      decrementUnread: jest.fn().mockResolvedValue(undefined),
      resetUnreadCount: jest.fn().mockResolvedValue(undefined),
      publishToSocket: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationService(
      mockNotifModel,
      mockPrefModel,
      mockRedisService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateNotificationDto = {
      type: 'like',
      toUserId: 'user-2',
      fromUserId: 'user-1',
      fromUserName: 'Alice',
      fromUserAvatar: 'avatar.png',
      data: { postId: 'post-100' },
    };

    it('should return early if toUserId equals fromUserId', async () => {
      await service.create({
        ...dto,
        toUserId: 'user-1',
        fromUserId: 'user-1',
      });

      expect(mockPrefModel.findOne).not.toHaveBeenCalled();
      expect(mockNotifModel.create).not.toHaveBeenCalled();
    });

    it('should return early if user preference for notification type is disabled', async () => {
      mockPrefModel.findOne.mockResolvedValue({ likes: false });

      await service.create(dto);

      expect(mockPrefModel.findOne).toHaveBeenCalledWith({ userId: 'user-2' });
      expect(mockNotifModel.create).not.toHaveBeenCalled();
    });

    it('should return early if notification is duplicate', async () => {
      mockPrefModel.findOne.mockResolvedValue(null);
      mockRedisService.isDuplicate.mockResolvedValue(true);

      await service.create(dto);

      expect(mockRedisService.isDuplicate).toHaveBeenCalledWith(
        'user-2',
        'like',
        'user-1:post-100',
      );
      expect(mockNotifModel.create).not.toHaveBeenCalled();
    });

    it('should create notification, increment unread, and publish to socket when valid', async () => {
      mockPrefModel.findOne.mockResolvedValue({ likes: true });
      mockRedisService.isDuplicate.mockResolvedValue(false);

      const createdDoc = {
        _id: 'notif-1',
        toUserId: 'user-2',
        fromUserId: 'user-1',
        fromUserName: 'Alice',
        fromUserAvatar: 'avatar.png',
        type: 'like',
        title: 'New Like',
        body: 'Alice liked your post',
        data: { postId: 'post-100' },
        isRead: false,
        createdAt: new Date('2026-01-01'),
      };
      mockNotifModel.create.mockResolvedValue(createdDoc);
      mockRedisService.incrementUnread.mockResolvedValue(5);

      await service.create(dto);

      expect(mockNotifModel.create).toHaveBeenCalledWith({
        toUserId: 'user-2',
        fromUserId: 'user-1',
        fromUserName: 'Alice',
        fromUserAvatar: 'avatar.png',
        type: 'like',
        title: 'New Like',
        body: 'Alice liked your post',
        data: { postId: 'post-100' },
      });
      expect(mockRedisService.incrementUnread).toHaveBeenCalledWith('user-2');
      expect(mockRedisService.publishToSocket).toHaveBeenCalledWith('user-2', {
        id: 'notif-1',
        toUserId: 'user-2',
        type: 'like',
        title: 'New Like',
        body: 'Alice liked your post',
        data: { postId: 'post-100' },
        isRead: false,
        createdAt: new Date('2026-01-01').toISOString(),
        sender: {
          id: 'user-1',
          username: 'Alice',
          fullName: 'Alice',
          avatar: 'avatar.png',
          verified: false,
        },
        unreadCount: 5,
      });
    });

    it('should correctly format data when data is a Map instance', async () => {
      mockPrefModel.findOne.mockResolvedValue(null);
      mockRedisService.isDuplicate.mockResolvedValue(false);

      const mapData = new Map<string, any>([['commentId', 'c-1']]);
      const createdDoc = {
        _id: 'notif-2',
        toUserId: 'user-2',
        fromUserId: 'user-1',
        fromUserName: 'Bob',
        fromUserAvatar: '',
        type: 'comment',
        title: 'New Comment',
        body: 'Bob commented: ""',
        data: mapData,
        isRead: false,
        createdAt: null,
      };
      mockNotifModel.create.mockResolvedValue(createdDoc);

      await service.create({ ...dto, type: 'comment' });

      expect(mockRedisService.publishToSocket).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({
          data: { commentId: 'c-1' },
          createdAt: '',
        }),
      );
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications with total and unreadCount', async () => {
      const mockRawNotifs = [
        {
          _id: 'n1',
          toUserId: 'u1',
          type: 'follow',
          title: 'New Follower',
          body: 'User follow',
          data: {},
          isRead: false,
          createdAt: new Date(),
          fromUserId: 'u2',
          fromUserName: 'User 2',
          fromUserAvatar: 'avatar2.jpg',
        },
      ];

      mockNotifModel.lean.mockResolvedValue(mockRawNotifs);
      mockNotifModel.countDocuments.mockResolvedValue(1);
      mockRedisService.getUnreadCount.mockResolvedValue(1);

      const res = await service.getNotifications('u1', 1, 10);

      expect(mockNotifModel.find).toHaveBeenCalledWith({ toUserId: 'u1' });
      expect(mockNotifModel.skip).toHaveBeenCalledWith(0);
      expect(mockNotifModel.limit).toHaveBeenCalledWith(10);
      expect(res).toEqual({
        notifications: [
          {
            id: 'n1',
            toUserId: 'u1',
            type: 'follow',
            title: 'New Follower',
            body: 'User follow',
            data: {},
            isRead: false,
            createdAt: expect.any(String),
            sender: {
              id: 'u2',
              username: 'User 2',
              fullName: 'User 2',
              avatar: 'avatar2.jpg',
              verified: false,
            },
          },
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
      });
    });
  });

  describe('markAsRead', () => {
    it('should update isRead flag and decrement unread count in redis', async () => {
      mockNotifModel.findOneAndUpdate.mockResolvedValue({});

      await service.markAsRead('u1', 'notif-1');

      expect(mockNotifModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'notif-1', toUserId: 'u1' },
        { $set: { isRead: true } },
      );
      expect(mockRedisService.decrementUnread).toHaveBeenCalledWith('u1');
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications to read and reset unread count', async () => {
      mockNotifModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await service.markAllAsRead('u1');

      expect(mockNotifModel.updateMany).toHaveBeenCalledWith(
        { toUserId: 'u1', isRead: false },
        { $set: { isRead: true } },
      );
      expect(mockRedisService.resetUnreadCount).toHaveBeenCalledWith('u1');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and decrement unread count if it was unread', async () => {
      mockNotifModel.findOneAndDelete.mockResolvedValue({
        _id: 'n1',
        isRead: false,
      });

      await service.deleteNotification('u1', 'n1');

      expect(mockNotifModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'n1',
        toUserId: 'u1',
      });
      expect(mockRedisService.decrementUnread).toHaveBeenCalledWith('u1');
    });

    it('should delete notification and NOT decrement unread count if it was already read', async () => {
      mockNotifModel.findOneAndDelete.mockResolvedValue({
        _id: 'n1',
        isRead: true,
      });

      await service.deleteNotification('u1', 'n1');

      expect(mockRedisService.decrementUnread).not.toHaveBeenCalled();
    });

    it('should do nothing if notification to delete was not found', async () => {
      mockNotifModel.findOneAndDelete.mockResolvedValue(null);

      await service.deleteNotification('u1', 'n1');

      expect(mockRedisService.decrementUnread).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences if found', async () => {
      const pref = { userId: 'u1', likes: true, comments: false };
      mockPrefModel.findOne.mockResolvedValue(pref);

      const result = await service.getPreferences('u1');

      expect(result).toEqual(pref);
      expect(mockPrefModel.create).not.toHaveBeenCalled();
    });

    it('should create default preferences if none exist', async () => {
      mockPrefModel.findOne.mockResolvedValue(null);
      const newPref = { userId: 'u1', likes: true };
      mockPrefModel.create.mockResolvedValue(newPref);

      const result = await service.getPreferences('u1');

      expect(mockPrefModel.create).toHaveBeenCalledWith({ userId: 'u1' });
      expect(result).toEqual(newPref);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences using findOneAndUpdate with upsert option', async () => {
      const updatedPref = { userId: 'u1', likes: false, comments: true };
      mockPrefModel.findOneAndUpdate.mockResolvedValue(updatedPref);

      const result = await service.updatePreferences('u1', {
        likes: false,
        comments: true,
      });

      expect(mockPrefModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'u1' },
        { $set: { likes: false, comments: true } },
        { upsert: true, new: true },
      );
      expect(result).toEqual(updatedPref);
    });
  });
});
