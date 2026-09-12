import { Test, TestingModule } from '@nestjs/testing';
import { NotificationResolver } from '../notification.resolver';
import { NotificationGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('NotificationResolver', () => {
  let resolver: NotificationResolver;
  let notificationClient: jest.Mocked<NotificationGrpcClient>;

  beforeEach(async () => {
    const mockNotificationGrpcClient = {
      getNotifications: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationResolver,
        {
          provide: NotificationGrpcClient,
          useValue: mockNotificationGrpcClient,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<NotificationResolver>(NotificationResolver);
    notificationClient = module.get(NotificationGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('notifications', () => {
    it('should call notificationClient.getNotifications', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      notificationClient.getNotifications.mockResolvedValue({
        notifications: [],
      } as any);

      const res = await resolver.notifications(ctx, 1, 20);
      expect(notificationClient.getNotifications).toHaveBeenCalledWith(
        'u1',
        1,
        20,
      );
      expect(res).toEqual({ notifications: [] });
    });
  });

  describe('markNotificationAsRead / markAllNotificationsAsRead / deleteNotification', () => {
    it('should call markNotificationAsRead', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      notificationClient.markAsRead.mockResolvedValue({ success: true } as any);

      const res = await resolver.markNotificationAsRead(ctx, 'n1');
      expect(notificationClient.markAsRead).toHaveBeenCalledWith('u1', 'n1');
      expect(res).toEqual({ success: true });
    });

    it('should call markAllNotificationsAsRead', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      notificationClient.markAllAsRead.mockResolvedValue({
        success: true,
      } as any);

      const res = await resolver.markAllNotificationsAsRead(ctx);
      expect(notificationClient.markAllAsRead).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ success: true });
    });

    it('should call deleteNotification', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      notificationClient.deleteNotification.mockResolvedValue({
        success: true,
      } as any);

      const res = await resolver.deleteNotification(ctx, 'n1');
      expect(notificationClient.deleteNotification).toHaveBeenCalledWith(
        'u1',
        'n1',
      );
      expect(res).toEqual({ success: true });
    });
  });

  describe('notificationPreferences / updateNotificationPreferences', () => {
    it('should call notificationPreferences', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      notificationClient.getPreferences.mockResolvedValue({
        preferences: {},
      } as any);

      const res = await resolver.notificationPreferences(ctx);
      expect(notificationClient.getPreferences).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ preferences: {} });
    });

    it('should call updateNotificationPreferences', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { likes: true, comments: false };
      notificationClient.updatePreferences.mockResolvedValue({
        success: true,
      } as any);

      const res = await resolver.updateNotificationPreferences(ctx, input);
      expect(notificationClient.updatePreferences).toHaveBeenCalledWith(
        'u1',
        input,
      );
      expect(res).toEqual({ success: true });
    });
  });
});
