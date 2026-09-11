import { Test, TestingModule } from '@nestjs/testing';
import { UserHttpController } from '../user.http.controller';
import { UserService } from '../user.service';

describe('UserHttpController', () => {
  let controller: UserHttpController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      searchUsers: jest.fn(),
      getSuggestions: jest.fn(),
      setOnline: jest.fn(),
      setOffline: jest.fn(),
      getOnlineStatus: jest.fn(),
      getUsersByIds: jest.fn(),
      getFollowerIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserHttpController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserHttpController>(UserHttpController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should call userService.getProfile', async () => {
      userService.getProfile.mockResolvedValue({
        success: true,
        user: { id: 'u1' },
      } as any);

      const res = await controller.getProfile('u1', 'u2');
      expect(userService.getProfile).toHaveBeenCalledWith('u1', 'u2');
      expect(res.user.id).toBe('u1');
    });

    it('should call userService.getProfile with empty string if requesterId is undefined', async () => {
      userService.getProfile.mockResolvedValue({
        success: true,
        user: { id: 'u1' },
      } as any);

      await controller.getProfile('u1', undefined);
      expect(userService.getProfile).toHaveBeenCalledWith('u1', '');
    });
  });

  describe('updateProfile', () => {
    it('should call userService.updateProfile', async () => {
      const dto = { userId: 'u1', name: 'New Name' };
      userService.updateProfile.mockResolvedValue({ success: true } as any);

      const res = await controller.updateProfile(dto);
      expect(userService.updateProfile).toHaveBeenCalledWith('u1', dto);
      expect(res.success).toBe(true);
    });
  });

  describe('followUser and unfollowUser', () => {
    it('should call userService.followUser', async () => {
      const dto = { followerId: 'u1', targetId: 'u2' };
      userService.followUser.mockResolvedValue({ success: true } as any);

      const res = await controller.followUser(dto);
      expect(userService.followUser).toHaveBeenCalledWith('u1', 'u2');
      expect(res.success).toBe(true);
    });

    it('should call userService.unfollowUser', async () => {
      const dto = { followerId: 'u1', targetId: 'u2' };
      userService.unfollowUser.mockResolvedValue({ success: true } as any);

      const res = await controller.unfollowUser(dto);
      expect(userService.unfollowUser).toHaveBeenCalledWith('u1', 'u2');
      expect(res.success).toBe(true);
    });
  });

  describe('getFollowers and getFollowing', () => {
    it('should call userService.getFollowers with parsed query parameters', async () => {
      userService.getFollowers.mockResolvedValue({
        success: true,
        users: [],
      } as any);

      await controller.getFollowers('u1', '2', '10');
      expect(userService.getFollowers).toHaveBeenCalledWith('u1', 2, 10);
    });

    it('should call userService.getFollowing with parsed query parameters', async () => {
      userService.getFollowing.mockResolvedValue({
        success: true,
        users: [],
      } as any);

      await controller.getFollowing('u1', '3', '15');
      expect(userService.getFollowing).toHaveBeenCalledWith('u1', 3, 15);
    });
  });

  describe('isFollowing', () => {
    it('should return isFollowing status from target user profile', async () => {
      userService.getProfile.mockResolvedValue({
        user: { isFollowing: true },
      } as any);

      const res = await controller.isFollowing('u1', 'u2');
      expect(userService.getProfile).toHaveBeenCalledWith('u2', 'u1');
      expect(res).toEqual({ isFollowing: true });
    });
  });

  describe('searchUsers', () => {
    it('should call userService.searchUsers', async () => {
      userService.searchUsers.mockResolvedValue({
        success: true,
        users: [],
      } as any);

      await controller.searchUsers('john', 'u1', '1', '10');
      expect(userService.searchUsers).toHaveBeenCalledWith('john', 'u1', 1, 10);
    });
  });

  describe('getSuggestions', () => {
    it('should call userService.getSuggestions', async () => {
      userService.getSuggestions.mockResolvedValue({
        success: true,
        users: [],
      } as any);

      await controller.getSuggestions('u1', '5');
      expect(userService.getSuggestions).toHaveBeenCalledWith('u1', 5);
    });
  });

  describe('presence', () => {
    it('should call setOnline', async () => {
      userService.setOnline.mockResolvedValue({ isOnline: true } as any);
      const res = await controller.setOnline({ userId: 'u1' });
      expect(userService.setOnline).toHaveBeenCalledWith('u1');
      expect(res.isOnline).toBe(true);
    });

    it('should call setOffline', async () => {
      userService.setOffline.mockResolvedValue({ isOnline: false } as any);
      const res = await controller.setOffline({ userId: 'u1' });
      expect(userService.setOffline).toHaveBeenCalledWith('u1');
      expect(res.isOnline).toBe(false);
    });

    it('should call getOnlineStatus', async () => {
      userService.getOnlineStatus.mockResolvedValue({
        isOnline: true,
        lastSeen: 123,
      });
      const res = await controller.getOnlineStatus('u1');
      expect(userService.getOnlineStatus).toHaveBeenCalledWith('u1');
      expect(res.isOnline).toBe(true);
    });
  });

  describe('getUsersByIds and getFollowerIds', () => {
    it('should call getUsersByIds', async () => {
      userService.getUsersByIds.mockResolvedValue({
        success: true,
        users: [],
      } as any);

      await controller.getUsersByIds({ userIds: ['u1', 'u2'] });
      expect(userService.getUsersByIds).toHaveBeenCalledWith(['u1', 'u2']);
    });

    it('should call getFollowerIds', async () => {
      userService.getFollowerIds.mockResolvedValue(['f1', 'f2']);

      const res = await controller.getFollowerIds('u1');
      expect(userService.getFollowerIds).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ followerIds: ['f1', 'f2'] });
    });
  });
});
