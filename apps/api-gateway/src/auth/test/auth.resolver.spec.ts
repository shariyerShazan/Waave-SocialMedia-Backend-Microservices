import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from '../auth.resolver';
import { AuthGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authClient: jest.Mocked<AuthGrpcClient>;

  beforeEach(async () => {
    const mockAuthGrpcClient = {
      register: jest.fn(),
      verifyRegistration: jest.fn(),
      forgotPasswordRequest: jest.fn(),
      resetPassword: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      getActiveSessions: jest.fn(),
      verifyMfa: jest.fn(),
      changePassword: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthGrpcClient, useValue: mockAuthGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authClient = module.get(AuthGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('register', () => {
    it('should call authClient.register', async () => {
      const input = { email: 'a@b.com', password: 'pass', name: 'User' };
      authClient.register.mockResolvedValue({ success: true } as any);

      const result = await resolver.register(input);
      expect(authClient.register).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true });
    });
  });

  describe('verifyRegistration', () => {
    it('should call authClient.verifyRegistration', async () => {
      const input = { email: 'a@b.com', otp: '123456' };
      authClient.verifyRegistration.mockResolvedValue({ success: true } as any);

      const result = await resolver.verifyRegistration(input);
      expect(authClient.verifyRegistration).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true });
    });
  });

  describe('forgotPassword', () => {
    it('should call authClient.forgotPasswordRequest', async () => {
      const input = { email: 'a@b.com' };
      authClient.forgotPasswordRequest.mockResolvedValue({
        success: true,
      } as any);

      const result = await resolver.forgotPassword(input);
      expect(authClient.forgotPasswordRequest).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true });
    });
  });

  describe('resetPassword', () => {
    it('should call authClient.resetPassword', async () => {
      const input = { email: 'a@b.com', otp: '123456', newPassword: 'new' };
      authClient.resetPassword.mockResolvedValue({ success: true } as any);

      const result = await resolver.resetPassword(input);
      expect(authClient.resetPassword).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true });
    });
  });

  describe('login', () => {
    it('should call authClient.login', async () => {
      const input = { email: 'a@b.com', password: 'pass' };
      authClient.login.mockResolvedValue({
        success: true,
        accessToken: 'token',
      } as any);

      const result = await resolver.login(input);
      expect(authClient.login).toHaveBeenCalledWith(input);
      expect(result).toEqual({ success: true, accessToken: 'token' });
    });
  });

  describe('refreshToken', () => {
    it('should call authClient.refreshToken', async () => {
      const input = { refreshToken: 'ref-token' };
      authClient.refreshToken.mockResolvedValue({
        success: true,
        accessToken: 'new-token',
      } as any);

      const result = await resolver.refreshToken(input);
      expect(authClient.refreshToken).toHaveBeenCalledWith('ref-token');
      expect(result).toEqual({ success: true, accessToken: 'new-token' });
    });
  });

  describe('revokeSession', () => {
    it('should call authClient.revokeSession', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.revokeSession.mockResolvedValue({ success: true } as any);

      const result = await resolver.revokeSession(ctx, 's1');
      expect(authClient.revokeSession).toHaveBeenCalledWith('u1', 's1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('revokeAllSessions', () => {
    it('should call authClient.revokeAllSessions', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.revokeAllSessions.mockResolvedValue({ success: true } as any);

      const result = await resolver.revokeAllSessions(ctx);
      expect(authClient.revokeAllSessions).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('activeSessions', () => {
    it('should call authClient.getActiveSessions', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.getActiveSessions.mockResolvedValue({ sessions: [] } as any);

      const result = await resolver.activeSessions(ctx);
      expect(authClient.getActiveSessions).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ sessions: [] });
    });
  });

  describe('verifyMfa', () => {
    it('should call authClient.verifyMfa', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.verifyMfa.mockResolvedValue({ success: true } as any);

      const result = await resolver.verifyMfa(ctx, '123456');
      expect(authClient.verifyMfa).toHaveBeenCalledWith('u1', '123456');
      expect(result).toEqual({ success: true });
    });
  });

  describe('changePassword', () => {
    it('should call authClient.changePassword', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { oldPassword: 'old', newPassword: 'new' };
      authClient.changePassword.mockResolvedValue({ success: true } as any);

      const result = await resolver.changePassword(ctx, input);
      expect(authClient.changePassword).toHaveBeenCalledWith('u1', input);
      expect(result).toEqual({ success: true });
    });
  });

  describe('logout', () => {
    it('should call authClient.logout', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.logout.mockResolvedValue({ success: true } as any);

      const result = await resolver.logout(ctx);
      expect(authClient.logout).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('me', () => {
    it('should call authClient.getMe', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      authClient.getMe.mockResolvedValue({ user: { id: 'u1' } } as any);

      const result = await resolver.me(ctx);
      expect(authClient.getMe).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ user: { id: 'u1' } });
    });
  });

  describe('allUsers', () => {
    it('should call authClient.getAllUsers with page and limit', async () => {
      authClient.getAllUsers.mockResolvedValue({ users: [] } as any);

      const result = await resolver.allUsers(2, 20);
      expect(authClient.getAllUsers).toHaveBeenCalledWith(2, 20);
      expect(result).toEqual({ users: [] });
    });
  });

  describe('userById', () => {
    it('should call authClient.getUserById', async () => {
      authClient.getUserById.mockResolvedValue({ user: { id: 'u1' } } as any);

      const result = await resolver.userById('u1');
      expect(authClient.getUserById).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ user: { id: 'u1' } });
    });
  });

  describe('userByEmail', () => {
    it('should call authClient.getUserByEmail', async () => {
      authClient.getUserByEmail.mockResolvedValue({
        user: { email: 'a@b.com' },
      } as any);

      const result = await resolver.userByEmail('a@b.com');
      expect(authClient.getUserByEmail).toHaveBeenCalledWith('a@b.com');
      expect(result).toEqual({ user: { email: 'a@b.com' } });
    });
  });
});
