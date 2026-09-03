import { Test, TestingModule } from '@nestjs/testing';
import { AuthRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('AuthRedisService', () => {
  let redisService: AuthRedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthRedisService],
    }).compile();

    redisService = module.get<AuthRedisService>(AuthRedisService);
  });

  it('should be defined', () => {
    expect(redisService).toBeDefined();
  });

  describe('onModuleDestroy', () => {
    it('should call quit on redis client', async () => {
      await redisService.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('OTP functions', () => {
    it('should generate a numeric OTP of specified length', () => {
      const otp = redisService.generateOtp(6);
      expect(otp).toHaveLength(6);
      expect(Number(otp)).not.toBeNaN();
    });

    it('should create and save OTP in redis', async () => {
      const otp = await redisService.createOtp(
        'test@example.com',
        'REGISTER',
        300,
      );
      expect(otp).toBeDefined();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'auth:otp:REGISTER:test@example.com',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('should verify correct OTP', async () => {
      mockRedisClient.get.mockResolvedValue('123456');
      const valid = await redisService.verifyOtp(
        'test@example.com',
        'REGISTER',
        '123456',
      );
      expect(valid).toBe(true);
    });

    it('should delete OTP', async () => {
      await redisService.deleteOtp('test@example.com', 'REGISTER');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'auth:otp:REGISTER:test@example.com',
      );
    });
  });

  describe('Blacklist token', () => {
    it('should blacklist a token JTI', async () => {
      await redisService.blacklistToken('jti-123', 900);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'auth:blacklist:jti-123',
        '1',
        'EX',
        900,
      );
    });

    it('should return true if token is blacklisted', async () => {
      mockRedisClient.get.mockResolvedValue('1');
      const result = await redisService.isBlackListed('jti-123');
      expect(result).toBe(true);
    });
  });

  describe('Login attempts', () => {
    it('should increment login attempts and set expire on first attempt', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      const count =
        await redisService.incrementLoginAttempts('test@example.com');
      expect(count).toBe(1);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'auth:attempts:test@example.com',
        900,
      );
    });

    it('should reset login attempts', async () => {
      await redisService.resetLoginAttempts('test@example.com');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'auth:attempts:test@example.com',
      );
    });
  });

  describe('Distributed locks', () => {
    it('should acquire lock when set returns OK', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const locked = await redisService.acquireDistributedLock('user-1');
      expect(locked).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'auth:lock:db:user-1',
        'locked',
        'EX',
        5,
        'NX',
      );
    });

    it('should release lock', async () => {
      await redisService.releaseDistributedLock('user-1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('auth:lock:db:user-1');
    });
  });

  describe('Cache operations', () => {
    it('should set and get cache data', async () => {
      const data = { id: 1, name: 'Waave' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      await redisService.setCache('key1', data, 600);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'cache:key1',
        JSON.stringify(data),
        'EX',
        600,
      );

      const result = await redisService.getCache('key1');
      expect(result).toEqual(data);
    });
  });
});
