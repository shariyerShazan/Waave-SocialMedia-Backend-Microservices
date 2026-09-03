import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../session.service';
import { AuthPrismaService } from '../../../prisma/prisma.service';
import { AuthRedisService } from '../../../redis/redis.service';

describe('SessionService', () => {
  let service: SessionService;
  let prismaService: any;
  let redisService: any;

  beforeEach(async () => {
    prismaService = {
      writeDb: {
        session: {
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        securityState: {
          upsert: jest.fn(),
        },
      },
      readDb: {
        session: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    redisService = {
      saveSessionCache: jest.fn(),
      getSessionCache: jest.fn(),
      deleteSessionCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: AuthPrismaService, useValue: prismaService },
        { provide: AuthRedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create session and save to cache', async () => {
      const mockSession = {
        id: 'sid-1',
        userId: 'u-1',
        deviceId: 'd-1',
        deviceFingerprint: 'fp-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      prismaService.writeDb.session.create.mockResolvedValue(mockSession);

      const session = await service.createSession(
        'u-1',
        'd-1',
        'fp-1',
        '127.0.0.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );

      expect(prismaService.writeDb.session.create).toHaveBeenCalled();
      expect(redisService.saveSessionCache).toHaveBeenCalledWith(
        'sid-1',
        mockSession,
        expect.any(Number),
      );
      expect(session).toEqual(mockSession);
    });
  });

  describe('validateSession', () => {
    it('should return true for valid cached session', async () => {
      const mockSession = {
        id: 'sid-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        lastActivity: new Date(Date.now()),
      };
      redisService.getSessionCache.mockResolvedValue(mockSession);

      const isValid = await service.validateSession('sid-1');
      expect(isValid).toBe(true);
    });

    it('should return false if cached session is revoked', async () => {
      const mockSession = {
        id: 'sid-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100000),
      };
      redisService.getSessionCache.mockResolvedValue(mockSession);

      const isValid = await service.validateSession('sid-1');
      expect(isValid).toBe(false);
    });

    it('should query DB if session not in cache and cache it if valid', async () => {
      redisService.getSessionCache.mockResolvedValue(null);
      const mockSession = {
        id: 'sid-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        lastActivity: new Date(Date.now()),
      };
      prismaService.readDb.session.findUnique.mockResolvedValue(mockSession);

      const isValid = await service.validateSession('sid-1');
      expect(isValid).toBe(true);
      expect(redisService.saveSessionCache).toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should mark session as revoked in DB and remove from cache', async () => {
      prismaService.writeDb.session.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeSession('u-1', 'sid-1');
      expect(prismaService.writeDb.session.updateMany).toHaveBeenCalledWith({
        where: { id: 'sid-1', userId: 'u-1' },
        data: { isRevoked: true },
      });
      expect(redisService.deleteSessionCache).toHaveBeenCalledWith('sid-1');
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions, clear cache, and increment tokenVersion', async () => {
      prismaService.readDb.session.findMany.mockResolvedValue([
        { id: 'sid-1' },
        { id: 'sid-2' },
      ]);
      prismaService.writeDb.session.updateMany.mockResolvedValue({ count: 2 });
      prismaService.writeDb.securityState.upsert.mockResolvedValue({});

      await service.revokeAllSessions('u-1');

      expect(prismaService.writeDb.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect(redisService.deleteSessionCache).toHaveBeenCalledWith('sid-1');
      expect(redisService.deleteSessionCache).toHaveBeenCalledWith('sid-2');
      expect(prismaService.writeDb.securityState.upsert).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        create: { userId: 'u-1', tokenVersion: 1 },
        update: { tokenVersion: { increment: 1 } },
      });
    });
  });
});
