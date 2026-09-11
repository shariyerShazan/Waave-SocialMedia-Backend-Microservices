import { Test, TestingModule } from '@nestjs/testing';
import { UserGrpcController } from '../user.grpc.controller';
import { UserService } from '../user.service';

describe('UserGrpcController', () => {
  let controller: UserGrpcController;
  let userService: any;

  beforeEach(async () => {
    userService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      checkIsFollowing: jest.fn(),
      searchUsers: jest.fn(),
      getSuggestions: jest.fn(),
      setOnline: jest.fn(),
      setOffline: jest.fn(),
      getOnlineStatus: jest.fn(),
      getUsersByIds: jest.fn(),
      getFollowerIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserGrpcController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserGrpcController>(UserGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should call userService.getProfile', async () => {
      userService.getProfile.mockResolvedValue({ success: true });
      const res = await controller.getProfile({
        userId: 'u1',
        requesterId: 'u2',
      });
      expect(userService.getProfile).toHaveBeenCalledWith('u1', 'u2');
      expect(res).toEqual({ success: true });
    });
  });

  describe('updateProfile', () => {
    it('should extract userId and call userService.updateProfile', async () => {
      userService.updateProfile.mockResolvedValue({ success: true });
      const res = await controller.updateProfile({
        userId: 'u1',
        name: 'New Name',
      });
      expect(userService.updateProfile).toHaveBeenCalledWith('u1', {
        name: 'New Name',
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('followUser and unfollowUser', () => {
    it('should call userService.followUser', async () => {
      userService.followUser.mockResolvedValue({ success: true });
      await controller.followUser({ followerId: 'u1', targetId: 'u2' });
      expect(userService.followUser).toHaveBeenCalledWith('u1', 'u2');
    });

    it('should call userService.unfollowUser', async () => {
      userService.unfollowUser.mockResolvedValue({ success: true });
      await controller.unfollowUser({ followerId: 'u1', targetId: 'u2' });
      expect(userService.unfollowUser).toHaveBeenCalledWith('u1', 'u2');
    });
  });

  describe('getFollowers and getFollowing', () => {
    it('should call userService.getFollowers', async () => {
      userService.getFollowers.mockResolvedValue({ success: true });
      await controller.getFollowers({ userId: 'u1', page: 1, limit: 10 });
      expect(userService.getFollowers).toHaveBeenCalledWith('u1', 1, 10);
    });

    it('should call userService.getFollowing', async () => {
      userService.getFollowing.mockResolvedValue({ success: true });
      await controller.getFollowing({ userId: 'u1', page: 2, limit: 20 });
      expect(userService.getFollowing).toHaveBeenCalledWith('u1', 2, 20);
    });
  });

  describe('isFollowing', () => {
    it('should call checkIsFollowing and return formatted object', async () => {
      userService.checkIsFollowing.mockResolvedValue(true);
      const res = await controller.isFollowing({
        followerId: 'u1',
        targetId: 'u2',
      });
      expect(userService.checkIsFollowing).toHaveBeenCalledWith('u1', 'u2');
      expect(res).toEqual({ isFollowing: true });
    });
  });

  describe('searchUsers', () => {
    it('should call userService.searchUsers', async () => {
      userService.searchUsers.mockResolvedValue({ success: true });
      await controller.searchUsers({
        query: 'john',
        requesterId: 'u1',
        page: 1,
        limit: 10,
      });
      expect(userService.searchUsers).toHaveBeenCalledWith('john', 'u1', 1, 10);
    });
  });

  describe('getSuggestions', () => {
    it('should call userService.getSuggestions', async () => {
      userService.getSuggestions.mockResolvedValue({ success: true });
      await controller.getSuggestions({ userId: 'u1', limit: 5 });
      expect(userService.getSuggestions).toHaveBeenCalledWith('u1', 5);
    });
  });

  describe('presence', () => {
    it('should call setOnline, setOffline, and getOnlineStatus', async () => {
      userService.setOnline.mockResolvedValue({ isOnline: true });
      userService.setOffline.mockResolvedValue({ isOnline: false });
      userService.getOnlineStatus.mockResolvedValue({ isOnline: true });

      await controller.setOnline({ userId: 'u1' });
      expect(userService.setOnline).toHaveBeenCalledWith('u1');

      await controller.setOffline({ userId: 'u1' });
      expect(userService.setOffline).toHaveBeenCalledWith('u1');

      await controller.getOnlineStatus({ userId: 'u1' });
      expect(userService.getOnlineStatus).toHaveBeenCalledWith('u1');
    });
  });

  describe('getUsersByIds and getFollowerIds', () => {
    it('should call getUsersByIds', async () => {
      userService.getUsersByIds.mockResolvedValue({ success: true });
      await controller.getUsersByIds({ userIds: ['u1', 'u2'] });
      expect(userService.getUsersByIds).toHaveBeenCalledWith(['u1', 'u2']);
    });

    it('should call getFollowerIds', async () => {
      userService.getFollowerIds.mockResolvedValue(['f1', 'f2']);
      const res = await controller.getFollowerIds({ userId: 'u1' });
      expect(userService.getFollowerIds).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ followerIds: ['f1', 'f2'] });
    });
  });
});
