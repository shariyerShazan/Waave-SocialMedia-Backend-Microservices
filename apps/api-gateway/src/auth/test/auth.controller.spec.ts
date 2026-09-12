import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('AuthController', () => {
  let controller: AuthController;
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
      controllers: [AuthController],
      providers: [{ provide: AuthGrpcClient, useValue: mockAuthGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authClient = module.get(AuthGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authClient.register', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      };
      authClient.register.mockResolvedValue({
        success: true,
        message: 'Registered',
      });

      const result = await controller.register(dto);
      expect(authClient.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'Registered' });
    });
  });

  describe('verifyRegistration', () => {
    it('should call authClient.verifyRegistration', async () => {
      const dto = { email: 'test@example.com', otp: '123456' };
      authClient.verifyRegistration.mockResolvedValue({
        success: true,
        message: 'Verified',
      });

      const result = await controller.verifyRegistration(dto);
      expect(authClient.verifyRegistration).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'Verified' });
    });
  });

  describe('forgotPassword', () => {
    it('should call authClient.forgotPasswordRequest', async () => {
      const dto = { email: 'test@example.com' };
      authClient.forgotPasswordRequest.mockResolvedValue({
        success: true,
        message: 'OTP Sent',
      });

      const result = await controller.forgotPassword(dto);
      expect(authClient.forgotPasswordRequest).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'OTP Sent' });
    });
  });

  describe('resetPassword', () => {
    it('should call authClient.resetPassword', async () => {
      const dto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newPassword123',
      };
      authClient.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset',
      });

      const result = await controller.resetPassword(dto);
      expect(authClient.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'Password reset' });
    });
  });

  describe('login', () => {
    it('should call authClient.login', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      authClient.login.mockResolvedValue({
        success: true,
        accessToken: 'jwt',
        refreshToken: 'ref',
      } as any);

      const result = await controller.login(dto);
      expect(authClient.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        accessToken: 'jwt',
        refreshToken: 'ref',
      });
    });
  });

  describe('refresh', () => {
    it('should call authClient.refreshToken with refresh token', async () => {
      const dto = { refreshToken: 'ref-token' };
      authClient.refreshToken.mockResolvedValue({
        success: true,
        accessToken: 'new-jwt',
      } as any);

      const result = await controller.refresh(dto);
      expect(authClient.refreshToken).toHaveBeenCalledWith('ref-token');
      expect(result).toEqual({ success: true, accessToken: 'new-jwt' });
    });
  });

  describe('revokeSession', () => {
    it('should call authClient.revokeSession with req.user.userId and sessionId', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.revokeSession.mockResolvedValue({ success: true } as any);

      const result = await controller.revokeSession(req, 'session-123');
      expect(authClient.revokeSession).toHaveBeenCalledWith(
        'user-1',
        'session-123',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('revokeAllSessions', () => {
    it('should call authClient.revokeAllSessions with req.user.userId', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.revokeAllSessions.mockResolvedValue({ success: true } as any);

      const result = await controller.revokeAllSessions(req);
      expect(authClient.revokeAllSessions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getActiveSessions', () => {
    it('should call authClient.getActiveSessions with req.user.userId', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.getActiveSessions.mockResolvedValue({ sessions: [] } as any);

      const result = await controller.getActiveSessions(req);
      expect(authClient.getActiveSessions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ sessions: [] });
    });
  });

  describe('verifyMfa', () => {
    it('should call authClient.verifyMfa with userId and code', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.verifyMfa.mockResolvedValue({ success: true } as any);

      const result = await controller.verifyMfa(req, '123456');
      expect(authClient.verifyMfa).toHaveBeenCalledWith('user-1', '123456');
      expect(result).toEqual({ success: true });
    });
  });

  describe('changePassword', () => {
    it('should call authClient.changePassword', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      const dto = { oldPassword: 'old', newPassword: 'new' };
      authClient.changePassword.mockResolvedValue({ success: true } as any);

      const result = await controller.changePassword(req, dto);
      expect(authClient.changePassword).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('logout', () => {
    it('should call authClient.logout', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.logout.mockResolvedValue({ success: true } as any);

      const result = await controller.logout(req);
      expect(authClient.logout).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getMe', () => {
    it('should call authClient.getMe', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      authClient.getMe.mockResolvedValue({ user: { id: 'user-1' } } as any);

      const result = await controller.getMe(req);
      expect(authClient.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ user: { id: 'user-1' } });
    });
  });

  describe('getAllUsers', () => {
    it('should parse page and limit params or use default 1, 10', async () => {
      authClient.getAllUsers.mockResolvedValue({ users: [], total: 0 } as any);

      await controller.getAllUsers();
      expect(authClient.getAllUsers).toHaveBeenCalledWith(1, 10);

      await controller.getAllUsers('2', '20');
      expect(authClient.getAllUsers).toHaveBeenCalledWith(2, 20);
    });
  });

  describe('getUserById', () => {
    it('should call authClient.getUserById', async () => {
      authClient.getUserById.mockResolvedValue({ user: { id: 'u1' } } as any);

      const result = await controller.getUserById('u1');
      expect(authClient.getUserById).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ user: { id: 'u1' } });
    });
  });

  describe('getUserByEmail', () => {
    it('should call authClient.getUserByEmail', async () => {
      authClient.getUserByEmail.mockResolvedValue({
        user: { email: 'a@b.com' },
      } as any);

      const result = await controller.getUserByEmail('a@b.com');
      expect(authClient.getUserByEmail).toHaveBeenCalledWith('a@b.com');
      expect(result).toEqual({ user: { email: 'a@b.com' } });
    });
  });
});
