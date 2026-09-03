import { Test, TestingModule } from '@nestjs/testing';
import { AuthHttpController } from '../auth.http.controller';
import { AuthService } from '../auth.service';

describe('AuthHttpController', () => {
  let controller: AuthHttpController;
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
      controllers: [AuthHttpController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthHttpController>(AuthHttpController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { email: 'a@b.com', password: 'pass', name: 'User' };
      authService.register.mockResolvedValue({
        success: true,
        message: 'Registered',
      });

      const res = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ success: true, message: 'Registered' });
    });
  });

  describe('verifyRegistration', () => {
    it('should call authService.verifyRegistration', async () => {
      const dto = { email: 'a@b.com', otp: '123456' };
      authService.verifyRegistration.mockResolvedValue({
        success: true,
        message: 'Verified',
      });

      const res = await controller.verifyRegistration(dto);
      expect(authService.verifyRegistration).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ success: true, message: 'Verified' });
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'a@b.com', password: 'pass' };
      authService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const res = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res.accessToken).toBe('access');
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      authService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out',
      });

      const res = await controller.logout('user-1', 'sid-1');
      expect(authService.logout).toHaveBeenCalledWith('user-1', 'sid-1');
      expect(res).toEqual({ success: true, message: 'Logged out' });
    });
  });

  describe('verifyToken', () => {
    it('should call authService.verifyToken', async () => {
      authService.verifyToken.mockResolvedValue({
        valid: true,
        userId: 'u1',
        email: 'a@b.com',
        role: 'USER',
        message: 'Valid',
        deviceId: 'd1',
      });

      const res = await controller.verifyToken('some-token');
      expect(authService.verifyToken).toHaveBeenCalledWith('some-token');
      expect(res.valid).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should call authService.getUserById', async () => {
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

      const res = await controller.getUserById('u1');
      expect(authService.getUserById).toHaveBeenCalledWith('u1');
      expect(res.user.id).toBe('u1');
    });
  });

  describe('getAllUsers', () => {
    it('should convert query string params to numbers and call authService.getAllUsers', async () => {
      authService.getAllUsers.mockResolvedValue({
        success: true,
        message: 'OK',
        users: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      const res = await controller.getAllUsers('2', '10');
      expect(authService.getAllUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
      });
      expect(res.page).toBe(2);
    });
  });
});
