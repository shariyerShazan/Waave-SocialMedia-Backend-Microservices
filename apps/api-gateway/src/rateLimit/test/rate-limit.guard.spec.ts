import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard } from '../guard/rate-limit.guard';
import { RateLimiterService } from '../rateLimit.service';
import { RateLimitKeyType } from '../decorator/rate-limit.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let rateLimiterService: jest.Mocked<RateLimiterService>;

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
    };

    const mockRateLimiterService = {
      consume: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RateLimiterService, useValue: mockRateLimiterService },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);
    rateLimiterService = module.get(RateLimiterService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no rate limit metadata is configured', async () => {
    reflector.get.mockReturnValue(undefined);

    const mockContext = {
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should return true if request object is missing', async () => {
    reflector.get.mockReturnValue({ limit: 10, window: 60 });

    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => null,
        getResponse: () => null,
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: null, res: null }),
    } as any);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow request and set response headers when rate limit is not exceeded', async () => {
    reflector.get.mockReturnValue({
      limit: 10,
      window: 60,
      key: RateLimitKeyType.IP,
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: true,
      remaining: 9,
      reset: 60,
    });

    const mockSetHeader = jest.fn();
    const mockReq = {
      headers: { 'x-forwarded-for': '192.168.1.1' },
      method: 'GET',
      path: '/test',
    };
    const mockRes = {
      setHeader: mockSetHeader,
    };

    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => mockReq,
        getResponse: () => mockRes,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 60);
  });

  it('should build key correctly for IP_EMAIL key type', async () => {
    reflector.get.mockReturnValue({
      limit: 5,
      window: 60,
      key: RateLimitKeyType.IP_EMAIL,
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: true,
      remaining: 4,
      reset: 60,
    });

    const mockReq = {
      headers: {},
      ip: '127.0.0.1',
      method: 'POST',
      path: '/auth/login',
      body: { email: 'user@example.com' },
    };

    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => mockReq,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(mockContext);

    expect(rateLimiterService.consume).toHaveBeenCalledWith(
      'rl:POST:/auth/login:127.0.0.1:user@example.com',
      5,
      60,
    );
  });

  it('should build key correctly for USER_ID and IP_USER_ID key types', async () => {
    reflector.get.mockReturnValue({
      limit: 20,
      window: 60,
      key: RateLimitKeyType.IP_USER_ID,
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: true,
      remaining: 19,
      reset: 60,
    });

    const mockReq = {
      headers: {},
      ip: '10.0.0.1',
      method: 'GET',
      path: '/users/profile',
      user: { userId: 'user-123' },
    };

    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => mockReq,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(mockContext);

    expect(rateLimiterService.consume).toHaveBeenCalledWith(
      'rl:GET:/users/profile:10.0.0.1:user-123',
      20,
      60,
    );
  });

  it('should throw 429 HttpException when rate limit is exceeded', async () => {
    reflector.get.mockReturnValue({
      limit: 2,
      window: 60,
      key: RateLimitKeyType.IP,
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      reset: 30,
    });

    const mockReq = {
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      path: '/test',
    };

    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => mockReq,
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
  });
});
