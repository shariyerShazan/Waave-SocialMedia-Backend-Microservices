import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../token.service';
import { AuthRedisService } from '../../redis/redis.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<AuthRedisService>;

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
      decode: jest.fn(),
      verify: jest.fn(),
    };

    const mockRedisService = {
      isBlackListed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthRedisService, useValue: mockRedisService },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    redisService = module.get(AuthRedisService);
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with expected claims', () => {
      jwtService.sign.mockReturnValue('mock-access-token');

      const result = tokenService.generateAccessToken(
        {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'USER',
          deviceId: 'device-1',
          deviceFingerprint: 'fingerprint-1',
        },
        'jti-123',
        'sid-123',
        1,
      );

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          role: 'USER',
          deviceId: 'device-1',
          sid: 'sid-123',
          tokenVersion: 1,
          deviceFingerprint: 'fingerprint-1',
        },
        expect.objectContaining({
          subject: 'user-123',
          jwtid: 'jti-123',
        }),
      );
      expect(result).toBe('mock-access-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with expected claims', () => {
      jwtService.sign.mockReturnValue('mock-refresh-token');

      const result = tokenService.generateRefreshToken(
        'user-123',
        'jti-456',
        'family-123',
      );

      expect(jwtService.sign).toHaveBeenCalledWith(
        { familyId: 'family-123' },
        expect.objectContaining({
          subject: 'user-123',
          jwtid: 'jti-456',
        }),
      );
      expect(result).toBe('mock-refresh-token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should return null if token is blacklisted in redis', async () => {
      jwtService.decode.mockReturnValue({ jti: 'blacklisted-jti' });
      redisService.isBlackListed.mockResolvedValue(true);

      const result = await tokenService.verifyAccessToken('token-123');
      expect(result).toBeNull();
      expect(redisService.isBlackListed).toHaveBeenCalledWith(
        'blacklisted-jti',
      );
    });

    it('should return verified token payload when token is valid', async () => {
      jwtService.decode.mockReturnValue({ jti: 'valid-jti' });
      redisService.isBlackListed.mockResolvedValue(false);
      jwtService.verify.mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        deviceId: 'device-1',
        sid: 'sid-1',
        jti: 'valid-jti',
        tokenVersion: 1,
        deviceFingerprint: 'fp-1',
      });

      const result = await tokenService.verifyAccessToken('valid-token');
      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        deviceId: 'device-1',
        sid: 'sid-1',
        jti: 'valid-jti',
        tokenVersion: 1,
        deviceFingerprint: 'fp-1',
      });
    });

    it('should return null on verification failure', async () => {
      jwtService.decode.mockReturnValue(null);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await tokenService.verifyAccessToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return refresh token payload when token is valid', () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-123',
        jti: 'jti-456',
        familyId: 'fam-789',
      });

      const result = tokenService.verifyRefreshToken('refresh-token');
      expect(result).toEqual({
        userId: 'user-123',
        jti: 'jti-456',
        familyId: 'fam-789',
      });
    });

    it('should return null if refresh token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Expired');
      });

      const result = tokenService.verifyRefreshToken('bad-token');
      expect(result).toBeNull();
    });
  });

  describe('getTokenTTL', () => {
    it('should calculate remaining TTL in seconds from exp claim', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 300;
      jwtService.decode.mockReturnValue({ exp: futureExp });

      const ttl = tokenService.getTokenTTL('some-token');
      expect(ttl).toBeGreaterThanOrEqual(298);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it('should return 0 if token has no exp claim or decoding fails', () => {
      jwtService.decode.mockReturnValue(null);
      expect(tokenService.getTokenTTL('invalid')).toBe(0);
    });
  });
});
