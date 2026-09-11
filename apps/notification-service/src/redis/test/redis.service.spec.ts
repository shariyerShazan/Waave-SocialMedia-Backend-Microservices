import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('NotificationRedisService', () => {
  let service: NotificationRedisService;
  let mockRedisClient: any;
  let mockPublisherClient: any;
  let mockSubscriberClient: any;
  let subscriberMessageCallback: (channel: string, raw: string) => void;

  beforeEach(async () => {
    mockRedisClient = {
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue('5'),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn().mockResolvedValue(0),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    mockPublisherClient = {
      publish: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    mockSubscriberClient = {
      subscribe: jest.fn().mockResolvedValue('OK'),
      on: jest.fn().mockImplementation((event: string, cb: any) => {
        if (event === 'message') {
          subscriberMessageCallback = cb;
        }
      }),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    let callCount = 0;
    (Redis as unknown as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount % 3 === 1) return mockRedisClient;
      if (callCount % 3 === 2) return mockPublisherClient;
      return mockSubscriberClient;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationRedisService],
    }).compile();

    service = module.get<NotificationRedisService>(NotificationRedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupSubscriber & onPushNotification', () => {
    it('should subscribe to notifications:push and trigger socket handlers on message', () => {
      const handler = jest.fn();
      service.onPushNotification(handler);

      const payload = { userId: 'u1', notification: { id: 'n1' } };
      subscriberMessageCallback('notifications:push', JSON.stringify(payload));

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should silently catch invalid JSON in subscriber message', () => {
      const handler = jest.fn();
      service.onPushNotification(handler);

      expect(() => {
        subscriberMessageCallback('notifications:push', 'invalid json');
      }).not.toThrow();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Unread Count', () => {
    it('should increment unread count and set expiration', async () => {
      mockRedisClient.incr.mockResolvedValue(3);
      const count = await service.incrementUnread('u1');

      expect(count).toBe(3);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('notif:unread:u1');
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'notif:unread:u1',
        86400,
      );
    });

    it('should get unread count as integer', async () => {
      mockRedisClient.get.mockResolvedValue('10');
      const count = await service.getUnreadCount('u1');

      expect(count).toBe(10);
      expect(mockRedisClient.get).toHaveBeenCalledWith('notif:unread:u1');
    });

    it('should return 0 for unread count if redis returns null', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const count = await service.getUnreadCount('u1');

      expect(count).toBe(0);
    });

    it('should reset unread count', async () => {
      await service.resetUnreadCount('u1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('notif:unread:u1');
    });

    it('should decrement unread count', async () => {
      mockRedisClient.decr.mockResolvedValue(1);
      await service.decrementUnread('u1');

      expect(mockRedisClient.decr).toHaveBeenCalledWith('notif:unread:u1');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should reset to 0 if decrement result is less than 0', async () => {
      mockRedisClient.decr.mockResolvedValue(-1);
      await service.decrementUnread('u1');

      expect(mockRedisClient.decr).toHaveBeenCalledWith('notif:unread:u1');
      expect(mockRedisClient.set).toHaveBeenCalledWith('notif:unread:u1', '0');
    });
  });

  describe('publishToSocket', () => {
    it('should publish message to publisher redis', async () => {
      await service.publishToSocket('u1', { test: true });

      expect(mockPublisherClient.publish).toHaveBeenCalledWith(
        'notifications:push',
        JSON.stringify({ userId: 'u1', notification: { test: true } }),
      );
    });
  });

  describe('isDuplicate', () => {
    it('should return false and set key if not duplicate', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const isDup = await service.isDuplicate('u1', 'like', 'p1');

      expect(isDup).toBe(false);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(
        'notif:dedup:u1:like:p1',
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'notif:dedup:u1:like:p1',
        '1',
        'EX',
        3600,
      );
    });

    it('should return true and not set key if duplicate', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const isDup = await service.isDuplicate('u1', 'like', 'p1');

      expect(isDup).toBe(true);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('Socket ID Store', () => {
    it('should set user socket ID with expiration', async () => {
      await service.setUserSocket('u1', 'socket-123');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'notif:socket:u1',
        'socket-123',
        'EX',
        86400,
      );
    });

    it('should get user socket ID', async () => {
      mockRedisClient.get.mockResolvedValue('socket-123');
      const socketId = await service.getUserSocket('u1');

      expect(socketId).toBe('socket-123');
      expect(mockRedisClient.get).toHaveBeenCalledWith('notif:socket:u1');
    });

    it('should remove user socket ID', async () => {
      await service.removeUserSocket('u1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('notif:socket:u1');
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit all redis clients', async () => {
      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockPublisherClient.quit).toHaveBeenCalled();
      expect(mockSubscriberClient.quit).toHaveBeenCalled();
    });
  });
});
