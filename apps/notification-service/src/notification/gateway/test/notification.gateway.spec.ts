import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../notification.gateway';
import { NotificationRedisService } from '../../../redis/redis.service';
import { NotificationService } from '../../notification.service';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockRedisService: any;
  let mockNotifService: any;
  let mockServer: any;
  let pushNotificationCallback: (data: {
    userId: string;
    notification: any;
  }) => void;

  beforeEach(async () => {
    mockRedisService = {
      onPushNotification: jest.fn().mockImplementation((cb) => {
        pushNotificationCallback = cb;
      }),
      setUserSocket: jest.fn().mockResolvedValue(undefined),
      getUserSocket: jest.fn().mockResolvedValue('socket-1'),
      removeUserSocket: jest.fn().mockResolvedValue(undefined),
      getUnreadCount: jest.fn().mockResolvedValue(3),
    };

    mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
      redis: mockRedisService,
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        { provide: NotificationRedisService, useValue: mockRedisService },
        { provide: NotificationService, useValue: mockNotifService },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should register onPushNotification listener and emit notification:new to user room', () => {
      gateway.afterInit();

      expect(mockRedisService.onPushNotification).toHaveBeenCalled();

      // Trigger the push callback
      const notifData = { id: 'n1', title: 'Test' };
      pushNotificationCallback({ userId: 'u1', notification: notifData });

      expect(mockServer.to).toHaveBeenCalledWith('user:u1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:new',
        notifData,
      );
    });
  });

  describe('handleConnection', () => {
    it('should disconnect client if userId is missing in handshake auth', async () => {
      const client: any = {
        handshake: { auth: {} },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(mockRedisService.setUserSocket).not.toHaveBeenCalled();
    });

    it('should join room, store socket ID, and emit unread count when userId is present', async () => {
      const client: any = {
        id: 'socket-999',
        handshake: { auth: { userId: 'u1' } },
        join: jest.fn().mockResolvedValue(undefined),
        emit: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.userId).toBe('u1');
      expect(client.join).toHaveBeenCalledWith('user:u1');
      expect(mockRedisService.setUserSocket).toHaveBeenCalledWith(
        'u1',
        'socket-999',
      );
      expect(mockRedisService.getUnreadCount).toHaveBeenCalledWith('u1');
      expect(client.emit).toHaveBeenCalledWith('notification:unread_count', {
        unreadCount: 3,
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user socket if client.userId is set', async () => {
      const client: any = { userId: 'u1' };

      await gateway.handleDisconnect(client);

      expect(mockRedisService.removeUserSocket).toHaveBeenCalledWith('u1');
    });

    it('should do nothing if client.userId is not set', async () => {
      const client: any = {};

      await gateway.handleDisconnect(client);

      expect(mockRedisService.removeUserSocket).not.toHaveBeenCalled();
    });
  });

  describe('handleRead', () => {
    it('should mark notification as read and emit updated unread count', async () => {
      const client: any = { userId: 'u1', emit: jest.fn() };
      mockRedisService.getUnreadCount.mockResolvedValue(2);

      await gateway.handleRead(client, { notificationId: 'n1' });

      expect(mockNotifService.markAsRead).toHaveBeenCalledWith('u1', 'n1');
      expect(mockRedisService.getUnreadCount).toHaveBeenCalledWith('u1');
      expect(client.emit).toHaveBeenCalledWith('notification:unread_count', {
        unreadCount: 2,
      });
    });
  });

  describe('handleReadAll', () => {
    it('should mark all notifications as read and emit unreadCount 0', async () => {
      const client: any = { userId: 'u1', emit: jest.fn() };

      await gateway.handleReadAll(client);

      expect(mockNotifService.markAllAsRead).toHaveBeenCalledWith('u1');
      expect(client.emit).toHaveBeenCalledWith('notification:unread_count', {
        unreadCount: 0,
      });
    });
  });
});
