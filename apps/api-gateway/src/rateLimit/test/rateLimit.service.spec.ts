import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from '../rateLimit.service';

const mockRedisClient = {
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('consume', () => {
    it('should set expiration on first request (total === 1)', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(59);

      const res = await service.consume('test-key', 5, 60);

      expect(mockRedisClient.incr).toHaveBeenCalledWith('test-key');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 60);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
      expect(res).toEqual({
        allowed: true,
        remaining: 4,
        reset: 59,
      });
    });

    it('should not call expire on subsequent requests (total > 1)', async () => {
      mockRedisClient.incr.mockResolvedValue(3);
      mockRedisClient.ttl.mockResolvedValue(45);

      const res = await service.consume('test-key', 5, 60);

      expect(mockRedisClient.incr).toHaveBeenCalledWith('test-key');
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
      expect(res).toEqual({
        allowed: true,
        remaining: 2,
        reset: 45,
      });
    });

    it('should return allowed: false when limit is exceeded', async () => {
      mockRedisClient.incr.mockResolvedValue(6);
      mockRedisClient.ttl.mockResolvedValue(30);

      const res = await service.consume('test-key', 5, 60);

      expect(res).toEqual({
        allowed: false,
        remaining: 0,
        reset: 30,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should call quit on redis client', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
