import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../notification.controller';
import { NotificationGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
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
      controllers: [NotificationController],
      providers: [
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

    controller = module.get<NotificationController>(NotificationController);
    notificationClient = module.get(NotificationGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should call notificationClient.getNotifications', async () => {
      const req = { user: { userId: 'u1' } } as any;
      notificationClient.getNotifications.mockResolvedValue({
        notifications: [],
      } as any);

      const res = await controller.getNotifications(req, '1', '20');
      expect(notificationClient.getNotifications).toHaveBeenCalledWith(
        'u1',
        1,
        20,
      );
      expect(res).toEqual({ notifications: [] });
    });
  });

  describe('markAsRead / markAllAsRead / deleteNotification', () => {
    it('should call markAsRead', async () => {
      const req = { user: { userId: 'u1' } } as any;
      notificationClient.markAsRead.mockResolvedValue({ success: true } as any);

      const res = await controller.markAsRead(req, 'n1');
      expect(notificationClient.markAsRead).toHaveBeenCalledWith('u1', 'n1');
      expect(res).toEqual({ success: true });
    });

    it('should call markAllAsRead', async () => {
      const req = { user: { userId: 'u1' } } as any;
      notificationClient.markAllAsRead.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.markAllAsRead(req);
      expect(notificationClient.markAllAsRead).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ success: true });
    });

    it('should call deleteNotification', async () => {
      const req = { user: { userId: 'u1' } } as any;
      notificationClient.deleteNotification.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.deleteNotification(req, 'n1');
      expect(notificationClient.deleteNotification).toHaveBeenCalledWith(
        'u1',
        'n1',
      );
      expect(res).toEqual({ success: true });
    });
  });

  describe('getPreferences / updatePreferences', () => {
    it('should call getPreferences', async () => {
      const req = { user: { userId: 'u1' } } as any;
      notificationClient.getPreferences.mockResolvedValue({
        preferences: {},
      } as any);

      const res = await controller.getPreferences(req);
      expect(notificationClient.getPreferences).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ preferences: {} });
    });

    it('should call updatePreferences', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { likes: true, comments: false };
      notificationClient.updatePreferences.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.updatePreferences(req, dto);
      expect(notificationClient.updatePreferences).toHaveBeenCalledWith(
        'u1',
        dto,
      );
      expect(res).toEqual({ success: true });
    });
  });
});
