import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from '../user.resolver';
import { UserGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('UserResolver', () => {
  let resolver: UserResolver;
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
      providers: [
        UserResolver,
        { provide: UserGrpcClient, useValue: mockUserGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<UserResolver>(UserResolver);
    userClient = module.get(UserGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('profile', () => {
    it('should call userClient.getProfile', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.getProfile.mockResolvedValue({ id: 'target' } as any);

      const res = await resolver.profile('target', ctx);
      expect(userClient.getProfile).toHaveBeenCalledWith('target', 'u1');
      expect(res).toEqual({ id: 'target' });
    });
  });

  describe('updateProfile', () => {
    it('should call userClient.updateProfile', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { bio: 'hello' };
      userClient.updateProfile.mockResolvedValue({ success: true } as any);

      const res = await resolver.updateProfile(ctx, input);
      expect(userClient.updateProfile).toHaveBeenCalledWith('u1', input);
      expect(res).toEqual({ success: true });
    });
  });

  describe('registerDevice', () => {
    it('should call userClient.registerDevice', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = {
        deviceId: 'd1',
        deviceName: 'Mac',
        platform: 'macOS',
        osVersion: '14',
        appVersion: '1.0',
      };
      userClient.registerDevice.mockResolvedValue({ success: true } as any);

      const res = await resolver.registerDevice(ctx, input);
      expect(userClient.registerDevice).toHaveBeenCalledWith({
        userId: 'u1',
        ...input,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('listDevices / revokeDevice', () => {
    it('should call listDevices', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.listDevices.mockResolvedValue({ devices: [] } as any);

      const res = await resolver.listDevices(ctx);
      expect(userClient.listDevices).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ devices: [] });
    });

    it('should call revokeDevice', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.revokeDevice.mockResolvedValue({ success: true } as any);

      const res = await resolver.revokeDevice(ctx, 'd1');
      expect(userClient.revokeDevice).toHaveBeenCalledWith('u1', 'd1');
      expect(res).toEqual({ success: true });
    });
  });

  describe('uploadKeys / rotateSignedPreKey / refillOneTimePreKeys', () => {
    it('should call uploadKeys', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = {
        deviceId: 'd1',
        identityKey: 'ik',
        signedPreKey: 'spk',
        oneTimePreKeys: [],
      };
      userClient.uploadKeys.mockResolvedValue({ success: true } as any);

      const res = await resolver.uploadKeys(ctx, input as any);
      expect(userClient.uploadKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...input,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call rotateSignedPreKey', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { deviceId: 'd1', signedPreKey: 'spk2' };
      userClient.rotateSignedPreKey.mockResolvedValue({ success: true } as any);

      const res = await resolver.rotateSignedPreKey(ctx, input as any);
      expect(userClient.rotateSignedPreKey).toHaveBeenCalledWith({
        userId: 'u1',
        ...input,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call refillOneTimePreKeys', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { deviceId: 'd1', oneTimePreKeys: [] };
      userClient.refillOneTimePreKeys.mockResolvedValue({
        success: true,
      } as any);

      const res = await resolver.refillOneTimePreKeys(ctx, input);
      expect(userClient.refillOneTimePreKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...input,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('keyBundle / oneTimePreKeysCount', () => {
    it('should call keyBundle', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.getKeyBundle.mockResolvedValue({ bundle: {} } as any);

      const res = await resolver.keyBundle(ctx, 'target', 'd1');
      expect(userClient.getKeyBundle).toHaveBeenCalledWith(
        'target',
        'u1',
        'd1',
      );
      expect(res).toEqual({ bundle: {} });
    });

    it('should call oneTimePreKeysCount', async () => {
      const ctx = { req: { user: { userId: 'u1', deviceId: 'd-jwt' } } };
      userClient.countOneTimePreKeys.mockResolvedValue({ count: 5 } as any);

      const res = await resolver.oneTimePreKeysCount(ctx, undefined);
      expect(userClient.countOneTimePreKeys).toHaveBeenCalledWith(
        'u1',
        'd-jwt',
      );
      expect(res).toEqual({ count: 5 });
    });
  });

  describe('followUser / unfollowUser / followers / following / isFollowing', () => {
    it('should call followUser', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.followUser.mockResolvedValue({ success: true } as any);

      const res = await resolver.followUser('target', ctx);
      expect(userClient.followUser).toHaveBeenCalledWith('u1', 'target');
      expect(res).toEqual({ success: true });
    });

    it('should call unfollowUser', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.unfollowUser.mockResolvedValue({ success: true } as any);

      const res = await resolver.unfollowUser('target', ctx);
      expect(userClient.unfollowUser).toHaveBeenCalledWith('u1', 'target');
      expect(res).toEqual({ success: true });
    });

    it('should call followers', async () => {
      userClient.getFollowers.mockResolvedValue({ followers: [] } as any);

      const res = await resolver.followers('u1', 1, 20);
      expect(userClient.getFollowers).toHaveBeenCalledWith('u1', 1, 20);
      expect(res).toEqual({ followers: [] });
    });

    it('should call following', async () => {
      userClient.getFollowing.mockResolvedValue({ following: [] } as any);

      const res = await resolver.following('u1', 1, 20);
      expect(userClient.getFollowing).toHaveBeenCalledWith('u1', 1, 20);
      expect(res).toEqual({ following: [] });
    });

    it('should call isFollowing', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.isFollowing.mockResolvedValue({ isFollowing: true });

      const res = await resolver.isFollowing('target', ctx);
      expect(userClient.isFollowing).toHaveBeenCalledWith('u1', 'target');
      expect(res).toEqual({ isFollowing: true });
    });
  });

  describe('searchUsers / userSuggestions / onlineStatus', () => {
    it('should call searchUsers', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.searchUsers.mockResolvedValue({ users: [] } as any);

      const res = await resolver.searchUsers(ctx, 'query', 1, 20);
      expect(userClient.searchUsers).toHaveBeenCalledWith('query', 'u1', 1, 20);
      expect(res).toEqual({ users: [] });
    });

    it('should call userSuggestions', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      userClient.getSuggestions.mockResolvedValue({ suggestions: [] } as any);

      const res = await resolver.userSuggestions(ctx, 10);
      expect(userClient.getSuggestions).toHaveBeenCalledWith('u1', 10);
      expect(res).toEqual({ suggestions: [] });
    });

    it('should call onlineStatus', async () => {
      userClient.getOnlineStatus.mockResolvedValue({ isOnline: true } as any);

      const res = await resolver.onlineStatus('u1');
      expect(userClient.getOnlineStatus).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ isOnline: true });
    });
  });
});
