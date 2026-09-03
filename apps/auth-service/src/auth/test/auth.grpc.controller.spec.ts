import { Test, TestingModule } from '@nestjs/testing';
import { AuthGrpcController } from '../auth.grpc.controller';
import { AuthService } from '../auth.service';

describe('AuthGrpcController', () => {
  let controller: AuthGrpcController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      verifyRegistration: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      verifyToken: jest.fn(),
      refreshToken: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      getAllUsers: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      getActiveSessions: jest.fn(),
      verifyMfa: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGrpcController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthGrpcController>(AuthGrpcController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to authService.register', async () => {
      const dto = { email: 'a@b.com', password: 'pass', name: 'User' };
      authService.register.mockResolvedValue({ success: true, message: 'OK' });

      const res = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ success: true, message: 'OK' });
    });
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const dto = { email: 'a@b.com', password: 'pass' };
      authService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
      });

      const res = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res.message).toBe('Login successful');
    });
  });

  describe('logout', () => {
    it('should extract parameters and call authService.logout', async () => {
      authService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out',
      });

      const res = await controller.logout({ userId: 'u1', sessionId: 's1' });
      expect(authService.logout).toHaveBeenCalledWith('u1', 's1');
      expect(res.success).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should extract token string and call authService.verifyToken', async () => {
      authService.verifyToken.mockResolvedValue({
        valid: true,
        userId: 'u1',
        email: 'a@b.com',
        role: 'USER',
        message: 'Valid',
        deviceId: 'd1',
      });

      const res = await controller.verifyToken({ token: 't123' });
      expect(authService.verifyToken).toHaveBeenCalledWith('t123');
      expect(res.valid).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should extract userId and call authService.getUserById', async () => {
      authService.getUserById.mockResolvedValue({
        success: true,
        message: 'OK',
        user: {
          id: 'u1',
          name: '',
          email: 'a@b.com',
          role: 'USER',
          createdAt: '',
        },
      });

      const res = await controller.getUserById({ userId: 'u1' });
      expect(authService.getUserById).toHaveBeenCalledWith('u1');
      expect(res.user.id).toBe('u1');
    });
  });
});
