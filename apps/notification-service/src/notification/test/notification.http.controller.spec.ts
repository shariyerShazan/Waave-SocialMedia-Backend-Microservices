import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHttpController } from '../notification.http.controller';
import { NotificationService } from '../notification.service';

describe('NotificationHttpController', () => {
  let controller: NotificationHttpController;
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
      controllers: [NotificationHttpController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationHttpController>(
      NotificationHttpController,
    );
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should delegate to service.getNotifications with converted number params', async () => {
      await controller.getNotifications('user-1', '2', '15');

      expect(service.getNotifications).toHaveBeenCalledWith('user-1', 2, 15);
    });

    it('should use default page and limit values if omitted', async () => {
      await controller.getNotifications('user-1');

      expect(service.getNotifications).toHaveBeenCalledWith('user-1', 1, 20);
    });
  });

  describe('markAsRead', () => {
    it('should delegate to service.markAsRead', async () => {
      await controller.markAsRead('notif-123', { userId: 'user-1' });

      expect(service.markAsRead).toHaveBeenCalledWith('user-1', 'notif-123');
    });
  });

  describe('markAllAsRead', () => {
    it('should delegate to service.markAllAsRead', async () => {
      await controller.markAllAsRead({ userId: 'user-1' });

      expect(service.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deleteNotification', () => {
    it('should delegate to service.deleteNotification', async () => {
      await controller.deleteNotification('notif-123', { userId: 'user-1' });

      expect(service.deleteNotification).toHaveBeenCalledWith(
        'user-1',
        'notif-123',
      );
    });
  });

  describe('getPreferences', () => {
    it('should delegate to service.getPreferences', async () => {
      await controller.getPreferences('user-1');

      expect(service.getPreferences).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updatePreferences', () => {
    it('should separate userId from dto and delegate to service.updatePreferences', async () => {
      const dto = {
        userId: 'user-1',
        likes: false,
        comments: true,
        follows: true,
        unfollows: false,
        mentions: true,
        messages: true,
      };

      await controller.updatePreferences(dto);

      expect(service.updatePreferences).toHaveBeenCalledWith('user-1', {
        likes: false,
        comments: true,
        follows: true,
        unfollows: false,
        mentions: true,
        messages: true,
      });
    });
  });
});
