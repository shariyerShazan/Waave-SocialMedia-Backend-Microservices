import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('E2eeChatRedisService', () => {
  let service: E2eeChatRedisService;
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
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue(['d1']),
      scard: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      incrby: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        set: jest.fn(),
        del: jest.fn(),
        sadd: jest.fn(),
        srem: jest.fn(),
        exists: jest.fn(),
        scard: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
      scanStream: jest.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          await Promise.resolve();
          yield ['e2ee:messages:c1:u1:d1'];
        },
      }),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [E2eeChatRedisService],
    }).compile();

    service = module.get<E2eeChatRedisService>(E2eeChatRedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy should quit redis clients', async () => {
    await service.onModuleDestroy();
    expect(mockRedisClient.quit).toHaveBeenCalledTimes(3);
  });

  describe('Pub/Sub functionality', () => {
    it('should register handler and publish message', async () => {
      const handler = jest.fn();
      service.onMessage(handler);

      await service.publish('e2ee:test', { key: 'val' });
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'e2ee:test',
        JSON.stringify({ key: 'val' }),
      );
    });

    it('should trigger handlers on pmessage event', () => {
      const handler = jest.fn();
      service.onMessage(handler);

      const pmessageCall = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'pmessage',
      );
      expect(pmessageCall).toBeDefined();

      const callback = pmessageCall[1];
      callback(
        'e2ee:*',
        'e2ee:presence',
        JSON.stringify({ type: 'device_online' }),
      );

      expect(handler).toHaveBeenCalledWith({
        channel: 'e2ee:presence',
        data: { type: 'device_online' },
      });
    });

    it('should handle JSON parse error in pmessage handler', () => {
      const handler = jest.fn();
      service.onMessage(handler);

      const pmessageCall = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'pmessage',
      );
      const callback = pmessageCall[1];
      expect(() =>
        callback('e2ee:*', 'e2ee:presence', 'invalid-json'),
      ).not.toThrow();
    });
  });

  describe('Device Presence & Status', () => {
    it('should set device online', async () => {
      await service.setDeviceOnline('u1', 'd1', 's1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'e2ee:presence',
        expect.stringContaining('"type":"device_online"'),
      );
    });

    it('should set device offline', async () => {
      mockRedisClient.scard.mockResolvedValue(0);
      await service.setDeviceOffline('u1', 'd1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'e2ee:presence',
        expect.stringContaining('"type":"device_offline"'),
      );
    });

    it('should get online devices', async () => {
      mockRedisClient.smembers.mockResolvedValue(['d1']);
      const mockPipeline = {
        exists: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const devices = await service.getOnlineDevices('u1');
      expect(devices).toEqual(['d1']);
    });

    it('should check if user is online', async () => {
      jest.spyOn(service, 'getOnlineDevices').mockResolvedValue(['d1']);
      const online = await service.isUserOnline('u1');
      expect(online).toBe(true);
    });

    it('should get device socket id', async () => {
      mockRedisClient.get.mockResolvedValue('s123');
      const socketId = await service.getDeviceSocketId('u1', 'd1');
      expect(socketId).toBe('s123');
    });

    it('should get online users list', async () => {
      mockRedisClient.smembers.mockResolvedValue(['d1']);
      jest.spyOn(service, 'isUserOnline').mockResolvedValue(true);
      const mockPipeline = {
        scard: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const onlineUsers = await service.getOnlineUsers(['u1']);
      expect(onlineUsers.has('u1')).toBe(true);
    });
  });

  describe('Typing Indicator', () => {
    it('should set typing and publish', async () => {
      await service.setTyping('c1', 'u1', 'd1');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'e2ee:typing:c1:u1:d1',
        '1',
        'EX',
        3,
      );
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.stringContaining('"type":"typing_start"'),
      );
    });

    it('should clear typing and publish', async () => {
      await service.clearTyping('c1', 'u1', 'd1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('e2ee:typing:c1:u1:d1');
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.stringContaining('"type":"typing_stop"'),
      );
    });
  });

  describe('Unread Counts and Caching', () => {
    it('should get and set unread count', async () => {
      mockRedisClient.get.mockResolvedValue('3');
      const count = await service.getUnreadCount('u1', 'c1');
      expect(count).toBe(3);

      await service.setUnreadCount('u1', 'c1', 5);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'e2ee:unread:u1:c1',
        '5',
        'EX',
        86400,
      );
    });

    it('should increment and clear unread count', async () => {
      await service.incrUnread('u1', 'c1', 2);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith(
        'e2ee:unread:u1:c1',
        2,
      );

      await service.clearUnread('u1', 'c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('e2ee:unread:u1:c1');
    });

    it('should cache and get recent messages', async () => {
      const msgs = [{ id: 'm1' }];
      await service.cacheRecentMessages('c1', 'u1', 'd1', msgs);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'e2ee:messages:c1:u1:d1',
        JSON.stringify(msgs),
        'EX',
        300,
      );

      mockRedisClient.get.mockResolvedValue(JSON.stringify(msgs));
      const cached = await service.getRecentMessages('c1', 'u1', 'd1');
      expect(cached).toEqual(msgs);
    });

    it('should invalidate message cache', async () => {
      await service.invalidateMessageCache('c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'e2ee:messages:c1:u1:d1',
      );
    });
  });

  describe('Rate Limiting & Group Notif Members', () => {
    it('should check rate limit', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      const res = await service.checkRateLimit('ip1', 10, 60);
      expect(res).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should set and get group notification members', async () => {
      const data = { members: ['u1', 'u2'] };
      await service.setGroupNotifMembers('c1', data);
      expect(mockRedisClient.set).toHaveBeenCalled();

      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));
      const res = await service.getGroupNotifMembers('c1');
      expect(res).toEqual(data);

      await service.invalidateGroupNotifMembers('c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'e2ee:group:notif:members:c1',
      );
    });
  });
});
