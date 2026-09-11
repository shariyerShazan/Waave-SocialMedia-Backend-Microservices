import { Test, TestingModule } from '@nestjs/testing';
import { MediaHttpController } from '../media.http.controller';
import { MediaService } from '../media.service';

describe('MediaHttpController', () => {
  let controller: MediaHttpController;
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
      controllers: [MediaHttpController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    }).compile();

    controller = module.get<MediaHttpController>(MediaHttpController);
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should extract userId from req and call mediaService.uploadImage', async () => {
      const mockFile: any = {
        buffer: Buffer.from('test'),
        originalname: 'test.png',
        mimetype: 'image/png',
      };
      const req: any = { body: {}, query: {}, headers: { 'x-user-id': 'u1' } };

      mediaService.uploadImage.mockResolvedValue({ success: true } as any);

      const res = await controller.uploadImage(mockFile, {} as any, req);
      expect(mediaService.uploadImage).toHaveBeenCalledWith(
        'u1',
        mockFile.buffer,
        'test.png',
        'image/png',
      );
      expect(res.success).toBe(true);
    });
  });

  describe('createMedia, getMedia, listUserMedia', () => {
    it('should call createMedia', async () => {
      mediaService.createMedia.mockResolvedValue({ success: true } as any);

      const dto = { userId: 'u1', type: 'IMAGE' };
      const res = await controller.createMedia(dto);
      expect(mediaService.createMedia).toHaveBeenCalledWith(dto);
      expect(res.success).toBe(true);
    });

    it('should call getMedia', async () => {
      mediaService.getMedia.mockResolvedValue({ success: true } as any);

      const res = await controller.getMedia('m1');
      expect(mediaService.getMedia).toHaveBeenCalledWith('m1');
      expect(res.success).toBe(true);
    });

    it('should call listUserMedia with parsed numbers', async () => {
      mediaService.listUserMedia.mockResolvedValue({ success: true } as any);

      await controller.listUserMedia('u1', 'IMAGE', '2', '10');
      expect(mediaService.listUserMedia).toHaveBeenCalledWith(
        'u1',
        'IMAGE',
        2,
        10,
      );
    });
  });

  describe('deleteMedia, exists, updateMediaStatus', () => {
    it('should call deleteMedia', async () => {
      mediaService.deleteMedia.mockResolvedValue({ success: true } as any);

      const res = await controller.deleteMedia('m1', 'u1');
      expect(mediaService.deleteMedia).toHaveBeenCalledWith('m1', 'u1');
      expect(res.success).toBe(true);
    });

    it('should call exists', async () => {
      mediaService.exists.mockResolvedValue({ success: true } as any);

      const res = await controller.exists('m1');
      expect(mediaService.exists).toHaveBeenCalledWith('m1');
      expect(res.success).toBe(true);
    });

    it('should call updateMediaStatus', async () => {
      mediaService.updateMediaStatus.mockResolvedValue({
        success: true,
      } as any);

      const dto = { mediaId: 'm1', status: 'DONE' };
      const res = await controller.updateMediaStatus(dto);
      expect(mediaService.updateMediaStatus).toHaveBeenCalledWith(dto);
      expect(res.success).toBe(true);
    });
  });

  describe('getMediaByPath and getMediaByIds', () => {
    it('should call getMediaByPath', async () => {
      mediaService.getMediaByPath.mockResolvedValue({ success: true } as any);

      const res = await controller.getMediaByPath('images/p1.webp');
      expect(mediaService.getMediaByPath).toHaveBeenCalledWith(
        'images/p1.webp',
      );
      expect(res.success).toBe(true);
    });

    it('should call getMediaByIds', async () => {
      mediaService.getMediaByIds.mockResolvedValue({ success: true } as any);

      const res = await controller.getMediaByIds(['m1', 'm2']);
      expect(mediaService.getMediaByIds).toHaveBeenCalledWith(['m1', 'm2']);
      expect(res.success).toBe(true);
    });
  });
});
