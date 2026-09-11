import { Test, TestingModule } from '@nestjs/testing';
import { MediaGrpcController } from '../media.grpc.controller';
import { MediaService } from '../media.service';

describe('MediaGrpcController', () => {
  let controller: MediaGrpcController;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const mockMediaService = {
      uploadImage: jest.fn(),
      createMedia: jest.fn(),
      getMedia: jest.fn(),
      listUserMedia: jest.fn(),
      deleteMedia: jest.fn(),
      exists: jest.fn(),
      updateMediaStatus: jest.fn(),
      getMediaByPath: jest.fn(),
      getMediaByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaGrpcController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    }).compile();

    controller = module.get<MediaGrpcController>(MediaGrpcController);
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('gRPC Method Handlers', () => {
    it('should handle uploadImage', async () => {
      mediaService.uploadImage.mockResolvedValue({ success: true } as any);

      const buffer = Buffer.from('test-image');
      const data = {
        userId: 'u1',
        buffer: buffer,
        originalName: 'test.png',
        mimeType: 'image/png',
      };

      const res = await controller.uploadImage(data);
      expect(mediaService.uploadImage).toHaveBeenCalledWith(
        'u1',
        expect.any(Buffer),
        'test.png',
        'image/png',
      );
      expect(res.success).toBe(true);
    });

    it('should handle createMedia', async () => {
      mediaService.createMedia.mockResolvedValue({ success: true } as any);

      const data = { userId: 'u1', type: 1, status: 3 } as any;
      const res = await controller.createMedia(data);
      expect(mediaService.createMedia).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });

    it('should handle getMedia', async () => {
      mediaService.getMedia.mockResolvedValue({ success: true } as any);

      const res = await controller.getMedia({ mediaId: 'm1' });
      expect(mediaService.getMedia).toHaveBeenCalledWith('m1');
      expect(res.success).toBe(true);
    });

    it('should handle listUserMedia', async () => {
      mediaService.listUserMedia.mockResolvedValue({ success: true } as any);

      const data = { userId: 'u1', type: 1, page: 1, limit: 10 } as any;
      await controller.listUserMedia(data);
      expect(mediaService.listUserMedia).toHaveBeenCalledWith('u1', 1, 1, 10);
    });

    it('should handle deleteMedia', async () => {
      mediaService.deleteMedia.mockResolvedValue({ success: true } as any);

      const res = await controller.deleteMedia({
        mediaId: 'm1',
        userId: 'u1',
      });
      expect(mediaService.deleteMedia).toHaveBeenCalledWith('m1', 'u1');
      expect(res.success).toBe(true);
    });

    it('should handle exists', async () => {
      mediaService.exists.mockResolvedValue({ success: true } as any);

      const res = await controller.exists({ mediaId: 'm1' });
      expect(mediaService.exists).toHaveBeenCalledWith('m1');
      expect(res.success).toBe(true);
    });

    it('should handle updateMediaStatus', async () => {
      mediaService.updateMediaStatus.mockResolvedValue({
        success: true,
      } as any);

      const data = { mediaId: 'm1', status: 3 } as any;
      const res = await controller.updateMediaStatus(data);
      expect(mediaService.updateMediaStatus).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });

    it('should handle getMediaByPath', async () => {
      mediaService.getMediaByPath.mockResolvedValue({ success: true } as any);

      const res = await controller.getMediaByPath({
        path: 'images/p1.webp',
      });
      expect(mediaService.getMediaByPath).toHaveBeenCalledWith(
        'images/p1.webp',
      );
      expect(res.success).toBe(true);
    });

    it('should handle getMediaByIds', async () => {
      mediaService.getMediaByIds.mockResolvedValue({ success: true } as any);

      const res = await controller.getMediaByIds({
        mediaIds: ['m1', 'm2'],
      });
      expect(mediaService.getMediaByIds).toHaveBeenCalledWith(['m1', 'm2']);
      expect(res.success).toBe(true);
    });
  });
});
