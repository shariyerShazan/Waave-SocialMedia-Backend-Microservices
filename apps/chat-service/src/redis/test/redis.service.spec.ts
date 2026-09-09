import { Test, TestingModule } from '@nestjs/testing';
import { ChatRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('ChatRedisService', () => {
  let redisService: ChatRedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(1),
      psubscribe: jest.fn().mockImplementation((pattern, cb) => cb && cb(null)),
      on: jest.fn(),
      hset: jest.fn().mockResolvedValue(1),
      hdel: jest.fn().mockResolvedValue(1),
      hget: jest.fn().mockResolvedValue('socket123'),
      hexists: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        hset: jest.fn(),
        hdel: jest.fn(),
        set: jest.fn(),
        hexists: jest.fn(),
        get: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
      scanStream: jest.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          await Promise.resolve();
          yield ['chat:typing:c1:u1'];
        },
      }),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatRedisService],
    }).compile();

    redisService = module.get<ChatRedisService>(ChatRedisService);
  });

  it('should be defined', () => {
    expect(redisService).toBeDefined();
  });

  describe('onModuleDestroy', () => {
    it('should call quit on redis clients', async () => {
      await redisService.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalledTimes(3);
    });
  });

  describe('Pub/Sub and handlers', () => {
    it('should add message handler and publish message', async () => {
      const handler = jest.fn();
      redisService.onMessage(handler);

      await redisService.publish('chat:test', { event: 'hello' });
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'chat:test',
        JSON.stringify({ event: 'hello' }),
      );
    });

    it('should trigger message handlers when pmessage event occurs', () => {
      const handler = jest.fn();
      redisService.onMessage(handler);

      // Find pmessage listener registered in setupSubscriber
      const pmessageCall = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'pmessage',
      );
      expect(pmessageCall).toBeDefined();

      const callback = pmessageCall[1];
      callback('chat:*', 'chat:presence', JSON.stringify({ type: 'online' }));

      expect(handler).toHaveBeenCalledWith({
        channel: 'chat:presence',
        data: { type: 'online' },
      });
    });

    it('should handle JSON parse error in pmessage handler gracefully', () => {
      const handler = jest.fn();
      redisService.onMessage(handler);

      const pmessageCall = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'pmessage',
      );
      const callback = pmessageCall[1];
      expect(() =>
        callback('chat:*', 'chat:presence', 'invalid-json'),
      ).not.toThrow();
    });
  });

  describe('Online Presence', () => {
    it('should set user online', async () => {
      await redisService.setUserOnline('u1', 's1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'chat:presence',
        expect.stringContaining('"type":"online"'),
      );
    });

    it('should set user offline', async () => {
      await redisService.setUserOffline('u1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'chat:presence',
        expect.stringContaining('"type":"offline"'),
      );
    });

    it('should get user socket id', async () => {
      const res = await redisService.getUserSocketId('u1');
      expect(res).toBe('socket123');
      expect(mockRedisClient.hget).toHaveBeenCalledWith(
        'chat:online:users',
        'u1',
      );
    });

    it('should check if user is online', async () => {
      mockRedisClient.hexists.mockResolvedValue(1);
      const online = await redisService.isOnline('u1');
      expect(online).toBe(true);
    });

    it('should return empty set if userIds is empty in getOnlineUsers', async () => {
      const res = await redisService.getOnlineUsers([]);
      expect(res.size).toBe(0);
    });

    it('should return set of online users', async () => {
      const mockPipeline = {
        hexists: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 0],
        ]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const res = await redisService.getOnlineUsers(['u1', 'u2']);
      expect(res.has('u1')).toBe(true);
      expect(res.has('u2')).toBe(false);
    });

    it('should get last seen timestamp', async () => {
      mockRedisClient.get.mockResolvedValue('1700000000000');
      const lastSeen = await redisService.getLastSeen('u1');
      expect(lastSeen).toBe(1700000000000);
    });

    it('should return 0 for last seen if null', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const lastSeen = await redisService.getLastSeen('u1');
      expect(lastSeen).toBe(0);
    });
  });

  describe('Typing Indicator', () => {
    it('should set typing and publish event', async () => {
      await redisService.setTyping('c1', 'u1', 'John');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'chat:typing:c1:u1',
        'John',
        'EX',
        3,
      );
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.stringContaining('"type":"typing_start"'),
      );
    });

    it('should clear typing and publish event', async () => {
      await redisService.clearTyping('c1', 'u1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('chat:typing:c1:u1');
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.stringContaining('"type":"typing_stop"'),
      );
    });

    it('should get typing users', async () => {
      const mockPipeline = {
        get: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 'John']]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const typing = await redisService.getTypingUsers('c1');
      expect(typing).toEqual(['John']);
    });

    it('should return empty array if no typing keys found', async () => {
      mockRedisClient.scanStream.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          await Promise.resolve();
          yield [];
        },
      });

      const typing = await redisService.getTypingUsers('c1');
      expect(typing).toEqual([]);
    });
  });

  describe('Message Cache', () => {
    it('should cache recent messages', async () => {
      const msgs = [{ id: 'm1', text: 'hi' }];
      await redisService.cacheRecentMessages('c1', msgs);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'chat:messages:c1',
        JSON.stringify(msgs),
        'EX',
        300,
      );
    });

    it('should get recent messages', async () => {
      const msgs = [{ id: 'm1', text: 'hi' }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(msgs));

      const res = await redisService.getRecentMessages('c1');
      expect(res).toEqual(msgs);
    });

    it('should return null if no recent messages cached', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const res = await redisService.getRecentMessages('c1');
      expect(res).toBeNull();
    });

    it('should invalidate message cache', async () => {
      await redisService.invalidateMessageCache('c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('chat:messages:c1');
    });
  });

  describe('Unread Count Cache', () => {
    it('should get unread count', async () => {
      mockRedisClient.get.mockResolvedValue('5');
      const count = await redisService.getUnreadCount('u1', 'c1');
      expect(count).toBe(5);
    });

    it('should set unread count', async () => {
      await redisService.setUnreadCount('u1', 'c1', 5);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'chat:unread:u1:c1',
        '5',
        'EX',
        86400,
      );
    });

    it('should clear unread count', async () => {
      await redisService.clearUnread('u1', 'c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('chat:unread:u1:c1');
    });
  });
});
