import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { AuthPrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../token/token.service';
import { AuthRedisService } from '../../redis/redis.service';
import { KafkaService } from '@app/kafka';
import { SessionService } from '../services/session.service';
import { MfaService } from '../services/mfa.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let tokens: any;
  let redis: any;
  let kafka: any;
  let sessionService: any;
  let mfaService: any;

  beforeEach(async () => {
    prisma = {
      writeDb: {
        user: {
          create: jest.fn(),
          update: jest.fn(),
        },
        userCredential: {
          update: jest.fn(),
        },
        passwordHistory: {
          create: jest.fn(),
        },
        securityState: {
          update: jest.fn(),
          upsert: jest.fn(),
        },
        loginHistory: {
          create: jest.fn(),
        },
        refreshTokenFamily: {
          create: jest.fn(),
          update: jest.fn(),
        },
        refreshToken: {
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
      },
      readDb: {
        user: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
        passwordHistory: {
          findMany: jest.fn(),
        },
        twoFactorAuth: {
          findUnique: jest.fn(),
        },
        securityState: {
          findUnique: jest.fn(),
        },
        refreshToken: {
          findUnique: jest.fn(),
        },
        session: {
          findFirst: jest.fn(),
        },
      },
    };

    tokens = {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      getTokenTTL: jest.fn().mockReturnValue(3600),
    };

    redis = {
      createOtp: jest.fn().mockResolvedValue('123456'),
      verifyOtp: jest.fn().mockResolvedValue(true),
      deleteOtp: jest.fn().mockResolvedValue(true),
      getLoginAttempts: jest.fn().mockResolvedValue(0),
      incrementLoginAttempts: jest.fn().mockResolvedValue(1),
      resetLoginAttempts: jest.fn().mockResolvedValue(true),
      getMfaTempState: jest.fn(),
      deleteMfaTempState: jest.fn(),
      saveMfaTempState: jest.fn(),
      acquireDistributedLock: jest.fn().mockResolvedValue(true),
      releaseDistributedLock: jest.fn().mockResolvedValue(true),
      getCache: jest.fn().mockResolvedValue(null),
      setCache: jest.fn().mockResolvedValue(true),
    };

    kafka = {
      emit: jest.fn().mockResolvedValue(true),
    };

    sessionService = {
      createSession: jest.fn().mockResolvedValue({ id: 'sid-123' }),
      revokeSession: jest.fn().mockResolvedValue(true),
      revokeAllSessions: jest.fn().mockResolvedValue(true),
      validateSession: jest.fn().mockResolvedValue(true),
      getActiveSessions: jest.fn().mockResolvedValue([
        {
          id: 'sid-1',
          deviceId: 'dev-1',
          ipAddress: '127.0.0.1',
          browser: 'Chrome',
          os: 'macOS',
          lastActivity: new Date(),
        },
      ]),
    };

    mfaService = {
      verifyMfa: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthPrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokens },
        { provide: AuthRedisService, useValue: redis },
        { provide: KafkaService, useValue: kafka },
        { provide: SessionService, useValue: sessionService },
        { provide: MfaService, useValue: mfaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw RpcException if email is already verified', async () => {
      prisma.readDb.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        isEmailVerified: true,
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should create new user and emit kafka events if email not taken', async () => {
      prisma.readDb.user.findUnique.mockResolvedValue(null);
      prisma.writeDb.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const res = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.user.create).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyRegistration', () => {
    it('should throw RpcException if OTP is invalid', async () => {
      redis.verifyOtp.mockResolvedValue(false);

      await expect(
        service.verifyRegistration({
          email: 'test@example.com',
          otp: '000000',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should update user isEmailVerified when OTP is valid', async () => {
      redis.verifyOtp.mockResolvedValue(true);
      prisma.writeDb.user.update.mockResolvedValue({ id: 'user-1' });

      const res = await service.verifyRegistration({
        email: 'test@example.com',
        otp: '123456',
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { isEmailVerified: true },
      });
      expect(redis.deleteOtp).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should return valid: false if token verification fails', async () => {
      tokens.verifyAccessToken.mockResolvedValue(null);

      const res = await service.verifyToken('invalid-token');
      expect(res.valid).toBe(false);
    });

    it('should return valid: true for valid token and session', async () => {
      tokens.verifyAccessToken.mockResolvedValue({
        userId: 'user-1',
        email: 'test@example.com',
        role: 'USER',
        sid: 'sid-1',
        tokenVersion: 1,
      });
      prisma.readDb.securityState.findUnique.mockResolvedValue({
        tokenVersion: 1,
      });
      sessionService.validateSession.mockResolvedValue(true);

      const res = await service.verifyToken('valid-token');
      expect(res.valid).toBe(true);
      expect(res.userId).toBe('user-1');
    });
  });

  describe('getUserById', () => {
    it('should return user from cache if available', async () => {
      const cachedUser = {
        id: 'user-1',
        name: '',
        email: 'cached@example.com',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      redis.getCache.mockResolvedValue(cachedUser);

      const res = await service.getUserById('user-1');
      expect(res.user).toEqual(cachedUser);
      expect(prisma.readDb.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch user from DB and cache if not in cache', async () => {
      redis.getCache.mockResolvedValue(null);
      prisma.readDb.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'db@example.com',
        role: 'USER',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const res = await service.getUserById('user-1');
      expect(res.user.email).toBe('db@example.com');
      expect(redis.setCache).toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('should fetch users with pagination and return mapped output', async () => {
      prisma.readDb.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          email: 'u1@example.com',
          role: 'USER',
          createdAt: new Date('2026-01-01'),
        },
      ]);
      prisma.readDb.user.count.mockResolvedValue(1);

      const res = await service.getAllUsers({ page: 1, limit: 10 });
      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.users).toHaveLength(1);
    });
  });
});
