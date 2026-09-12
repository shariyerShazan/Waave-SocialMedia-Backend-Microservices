import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../media.controller';
import { MediaGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaClient: jest.Mocked<MediaGrpcClient>;

  beforeEach(async () => {
    const mockMediaGrpcClient = {
      uploadImage: jest.fn(),
      createMedia: jest.fn(),
      getMedia: jest.fn(),
      getMediaByIds: jest.fn(),
      listUserMedia: jest.fn(),
      deleteMedia: jest.fn(),
      updateMediaStatus: jest.fn(),
      exists: jest.fn(),
      getMediaByPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaGrpcClient, useValue: mockMediaGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
    mediaClient = module.get(MediaGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should call mediaClient.uploadImage', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const file = {
        buffer: Buffer.from('abc'),
        originalname: 'pic.png',
        mimetype: 'image/png',
      };
      mediaClient.uploadImage.mockResolvedValue({ id: 'm1' } as any);

      const res = await controller.uploadImage(req, file);
      expect(mediaClient.uploadImage).toHaveBeenCalledWith(
        'u1',
        file.buffer,
        'pic.png',
        'image/png',
      );
      expect(res).toEqual({ id: 'm1' });
    });
  });

  describe('create', () => {
    it('should call mediaClient.createMedia with userId', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { path: '/path/file.png', type: 'IMAGE' };
      mediaClient.createMedia.mockResolvedValue({ id: 'm1' } as any);

      const res = await controller.create(req, dto);
      expect(mediaClient.createMedia).toHaveBeenCalledWith({
        ...dto,
        userId: 'u1',
      });
      expect(res).toEqual({ id: 'm1' });
    });
  });

  describe('getMedia / getMediaByIds', () => {
    it('should call getMedia', async () => {
      mediaClient.getMedia.mockResolvedValue({ id: 'm1' } as any);

      const res = await controller.getMedia('m1');
      expect(mediaClient.getMedia).toHaveBeenCalledWith('m1');
      expect(res).toEqual({ id: 'm1' });
    });

    it('should call getMediaByIds', async () => {
      mediaClient.getMediaByIds.mockResolvedValue({ media: [] } as any);

      const res = await controller.getMediaByIds(['m1', 'm2']);
      expect(mediaClient.getMediaByIds).toHaveBeenCalledWith(['m1', 'm2']);
      expect(res).toEqual({ media: [] });
    });
  });

  describe('list / remove / updateStatus / exists / getByPath', () => {
    it('should call listUserMedia', async () => {
      const req = { user: { userId: 'u1' } } as any;
      mediaClient.listUserMedia.mockResolvedValue({ media: [] } as any);

      const res = await controller.list(req, 'IMAGE', '1', '20');
      expect(mediaClient.listUserMedia).toHaveBeenCalledWith(
        'u1',
        'IMAGE',
        1,
        20,
      );
      expect(res).toEqual({ media: [] });
    });

    it('should call deleteMedia', async () => {
      const req = { user: { userId: 'u1' } } as any;
      mediaClient.deleteMedia.mockResolvedValue({ success: true } as any);

      const res = await controller.remove(req, 'm1');
      expect(mediaClient.deleteMedia).toHaveBeenCalledWith('m1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call updateMediaStatus', async () => {
      mediaClient.updateMediaStatus.mockResolvedValue({ success: true } as any);

      const res = await controller.updateStatus('m1', { status: 'READY' });
      expect(mediaClient.updateMediaStatus).toHaveBeenCalledWith({
        mediaId: 'm1',
        status: 'READY',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call exists', async () => {
      mediaClient.exists.mockResolvedValue({ exists: true } as any);

      const res = await controller.exists('m1');
      expect(mediaClient.exists).toHaveBeenCalledWith('m1');
      expect(res).toEqual({ exists: true });
    });

    it('should call getByPath', async () => {
      mediaClient.getMediaByPath.mockResolvedValue({ id: 'm1' } as any);

      const res = await controller.getByPath('/some/path.jpg');
      expect(mediaClient.getMediaByPath).toHaveBeenCalledWith('/some/path.jpg');
      expect(res).toEqual({ id: 'm1' });
    });
  });
});
