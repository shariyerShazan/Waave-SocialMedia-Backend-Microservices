import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGrpcController } from '../notification.grpc.controller';
import { NotificationService } from '../notification.service';

describe('NotificationGrpcController', () => {
  let controller: NotificationGrpcController;
  let service: NotificationService;

  beforeEach(async () => {
    const mockService = {
      getNotifications: jest
        .fn()
        .mockResolvedValue({ notifications: [], total: 0 }),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
      deleteNotification: jest.fn().mockResolvedValue(undefined),
      getPreferences: jest.fn().mockResolvedValue({ likes: true }),
      updatePreferences: jest.fn().mockResolvedValue({ likes: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationGrpcController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationGrpcController>(
      NotificationGrpcController,
    );
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should call notificationService.getNotifications with request parameters', async () => {
      const data = { userId: 'u1', page: 1, limit: 10 };
      await controller.getNotifications(data);

      expect(service.getNotifications).toHaveBeenCalledWith('u1', 1, 10);
    });
  });

  describe('markAsRead', () => {
    it('should call notificationService.markAsRead', async () => {
      const data = { userId: 'u1', notificationId: 'n1' };
      await controller.markAsRead(data);

      expect(service.markAsRead).toHaveBeenCalledWith('u1', 'n1');
    });
  });

  describe('markAllAsRead', () => {
    it('should call notificationService.markAllAsRead', async () => {
      const data = { userId: 'u1' };
      await controller.markAllAsRead(data);

      expect(service.markAllAsRead).toHaveBeenCalledWith('u1');
    });
  });

  describe('deleteNotification', () => {
    it('should call notificationService.deleteNotification', async () => {
      const data = { userId: 'u1', notificationId: 'n1' };
      await controller.deleteNotification(data);

      expect(service.deleteNotification).toHaveBeenCalledWith('u1', 'n1');
    });
  });

  describe('getPreferences', () => {
    it('should call notificationService.getPreferences', async () => {
      const data = { userId: 'u1' };
      await controller.getPreferences(data);

      expect(service.getPreferences).toHaveBeenCalledWith('u1');
    });
  });

  describe('updatePreferences', () => {
    it('should call notificationService.updatePreferences', async () => {
      const data = { userId: 'u1', likes: false };
      await controller.updatePreferences(data as any);

      expect(service.updatePreferences).toHaveBeenCalledWith('u1', data);
    });
  });
});
