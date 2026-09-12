import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('UserController', () => {
  let controller: UserController;
  let userClient: jest.Mocked<UserGrpcClient>;

  beforeEach(async () => {
    const mockUserGrpcClient = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      registerDevice: jest.fn(),
      listDevices: jest.fn(),
      revokeDevice: jest.fn(),
      uploadKeys: jest.fn(),
      rotateSignedPreKey: jest.fn(),
      refillOneTimePreKeys: jest.fn(),
      getKeyBundle: jest.fn(),
      countOneTimePreKeys: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      isFollowing: jest.fn(),
      searchUsers: jest.fn(),
      getSuggestions: jest.fn(),
      getOnlineStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserGrpcClient, useValue: mockUserGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userClient = module.get(UserGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should call userClient.getProfile', async () => {
      const req = { user: { userId: 'current-u' } } as any;
      userClient.getProfile.mockResolvedValue({ id: 'target-u' } as any);

      const res = await controller.getProfile('target-u', req);
      expect(userClient.getProfile).toHaveBeenCalledWith(
        'target-u',
        'current-u',
      );
      expect(res).toEqual({ id: 'target-u' });
    });
  });

  describe('updateProfile', () => {
    it('should call userClient.updateProfile', async () => {
      const req = { user: { userId: 'current-u' } } as any;
      const dto = { bio: 'hello' };
      userClient.updateProfile.mockResolvedValue({ success: true } as any);

      const res = await controller.updateProfile(req, dto);
      expect(userClient.updateProfile).toHaveBeenCalledWith('current-u', dto);
      expect(res).toEqual({ success: true });
    });
  });

  describe('registerDevice', () => {
    it('should call userClient.registerDevice with userId', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { deviceId: 'd1', deviceName: 'iPhone' };
      userClient.registerDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.registerDevice(req, dto as any);
      expect(userClient.registerDevice).toHaveBeenCalledWith({
        userId: 'u1',
        deviceId: 'd1',
        deviceName: 'iPhone',
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('listDevices', () => {
    it('should call userClient.listDevices', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.listDevices.mockResolvedValue({ devices: [] } as any);

      const res = await controller.listDevices(req);
      expect(userClient.listDevices).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ devices: [] });
    });
  });

  describe('revokeDevice', () => {
    it('should call userClient.revokeDevice', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.revokeDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.revokeDevice(req, 'd1');
      expect(userClient.revokeDevice).toHaveBeenCalledWith('u1', 'd1');
      expect(res).toEqual({ success: true });
    });
  });

  describe('uploadKeys', () => {
    it('should call userClient.uploadKeys', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = {
        deviceId: 'd1',
        identityKey: 'ik',
        signedPreKey: 'spk',
        oneTimePreKeys: [],
      };
      userClient.uploadKeys.mockResolvedValue({ success: true } as any);

      const res = await controller.uploadKeys(req, dto as any);
      expect(userClient.uploadKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('rotateSignedPreKey', () => {
    it('should call userClient.rotateSignedPreKey', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { deviceId: 'd1', signedPreKey: 'spk2' };
      userClient.rotateSignedPreKey.mockResolvedValue({ success: true } as any);

      const res = await controller.rotateSignedPreKey(req, dto as any);
      expect(userClient.rotateSignedPreKey).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('refillOneTimePreKeys', () => {
    it('should call userClient.refillOneTimePreKeys', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { deviceId: 'd1', oneTimePreKeys: [] };
      userClient.refillOneTimePreKeys.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.refillOneTimePreKeys(req, dto);
      expect(userClient.refillOneTimePreKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('getKeyBundle', () => {
    it('should call userClient.getKeyBundle with query deviceId or header', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.getKeyBundle.mockResolvedValue({ bundle: {} } as any);

      const res = await controller.getKeyBundle(
        req,
        'target-u',
        'd-query',
        'd-header',
      );
      expect(userClient.getKeyBundle).toHaveBeenCalledWith(
        'target-u',
        'u1',
        'd-query',
      );
      expect(res).toEqual({ bundle: {} });
    });
  });

  describe('countOneTimePreKeys', () => {
    it('should call userClient.countOneTimePreKeys', async () => {
      const req = { user: { userId: 'u1', deviceId: 'd-jwt' } } as any;
      userClient.countOneTimePreKeys.mockResolvedValue({ count: 10 } as any);

      const res = await controller.countOneTimePreKeys(req);
      expect(userClient.countOneTimePreKeys).toHaveBeenCalledWith(
        'u1',
        'd-jwt',
      );
      expect(res).toEqual({ count: 10 });
    });
  });

  describe('followUser / unfollowUser', () => {
    it('should call followUser', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.followUser.mockResolvedValue({ success: true } as any);

      const res = await controller.followUser('target-u', req);
      expect(userClient.followUser).toHaveBeenCalledWith('u1', 'target-u');
      expect(res).toEqual({ success: true });
    });

    it('should call unfollowUser', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.unfollowUser.mockResolvedValue({ success: true } as any);

      const res = await controller.unfollowUser('target-u', req);
      expect(userClient.unfollowUser).toHaveBeenCalledWith('u1', 'target-u');
      expect(res).toEqual({ success: true });
    });
  });

  describe('getFollowers / getFollowing / isFollowing', () => {
    it('should call getFollowers', async () => {
      userClient.getFollowers.mockResolvedValue({ followers: [] } as any);

      const res = await controller.getFollowers('u1', '2', '10');
      expect(userClient.getFollowers).toHaveBeenCalledWith('u1', 2, 10);
      expect(res).toEqual({ followers: [] });
    });

    it('should call getFollowing', async () => {
      userClient.getFollowing.mockResolvedValue({ following: [] } as any);

      const res = await controller.getFollowing('u1', '1', '20');
      expect(userClient.getFollowing).toHaveBeenCalledWith('u1', 1, 20);
      expect(res).toEqual({ following: [] });
    });

    it('should call isFollowing', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.isFollowing.mockResolvedValue({ isFollowing: true });

      const res = await controller.isFollowing('target-u', req);
      expect(userClient.isFollowing).toHaveBeenCalledWith('u1', 'target-u');
      expect(res).toEqual({ isFollowing: true });
    });
  });

  describe('searchUsers / getSuggestions / getOnlineStatus', () => {
    it('should call searchUsers', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.searchUsers.mockResolvedValue({ users: [] } as any);

      const res = await controller.searchUsers(req, 'john', '1', '10');
      expect(userClient.searchUsers).toHaveBeenCalledWith('john', 'u1', 1, 10);
      expect(res).toEqual({ users: [] });
    });

    it('should call getSuggestions', async () => {
      const req = { user: { userId: 'u1' } } as any;
      userClient.getSuggestions.mockResolvedValue({ suggestions: [] } as any);

      const res = await controller.getSuggestions(req, '5');
      expect(userClient.getSuggestions).toHaveBeenCalledWith('u1', 5);
      expect(res).toEqual({ suggestions: [] });
    });

    it('should call getOnlineStatus', async () => {
      userClient.getOnlineStatus.mockResolvedValue({ isOnline: true } as any);

      const res = await controller.getOnlineStatus('u1');
      expect(userClient.getOnlineStatus).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ isOnline: true });
    });
  });
});
