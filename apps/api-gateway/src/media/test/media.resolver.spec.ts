import { Test, TestingModule } from '@nestjs/testing';
import { MediaResolver } from '../media.resolver';
import { MediaGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('MediaResolver', () => {
  let resolver: MediaResolver;
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
      providers: [
        MediaResolver,
        { provide: MediaGrpcClient, useValue: mockMediaGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<MediaResolver>(MediaResolver);
    mediaClient = module.get(MediaGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createMedia', () => {
    it('should call mediaClient.createMedia', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { path: '/img.png', type: 'IMAGE' };
      mediaClient.createMedia.mockResolvedValue({ id: 'm1' } as any);

      const res = await resolver.createMedia(ctx, input as any);
      expect(mediaClient.createMedia).toHaveBeenCalledWith({
        path: '/img.png',
        type: 'IMAGE',
        userId: 'u1',
      });
      expect(res).toEqual({ id: 'm1' });
    });
  });

  describe('media / mediaBatch / userMedia / deleteMedia / updateMediaStatus / mediaExists / mediaByPath', () => {
    it('should call media', async () => {
      mediaClient.getMedia.mockResolvedValue({ id: 'm1' } as any);

      const res = await resolver.media('m1');
      expect(mediaClient.getMedia).toHaveBeenCalledWith('m1');
      expect(res).toEqual({ id: 'm1' });
    });

    it('should call mediaBatch', async () => {
      mediaClient.getMediaByIds.mockResolvedValue({ media: [] } as any);

      const res = await resolver.mediaBatch(['m1', 'm2']);
      expect(mediaClient.getMediaByIds).toHaveBeenCalledWith(['m1', 'm2']);
      expect(res).toEqual({ media: [] });
    });

    it('should call userMedia', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      mediaClient.listUserMedia.mockResolvedValue({ media: [] } as any);

      const res = await resolver.userMedia(ctx, 'all', 1, 20);
      expect(mediaClient.listUserMedia).toHaveBeenCalledWith(
        'u1',
        'all',
        1,
        20,
      );
      expect(res).toEqual({ media: [] });
    });

    it('should call deleteMedia', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      mediaClient.deleteMedia.mockResolvedValue({ success: true } as any);

      const res = await resolver.deleteMedia(ctx, 'm1');
      expect(mediaClient.deleteMedia).toHaveBeenCalledWith('m1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call updateMediaStatus', async () => {
      mediaClient.updateMediaStatus.mockResolvedValue({ success: true } as any);

      const res = await resolver.updateMediaStatus('m1', {
        status: 'READY',
      });
      expect(mediaClient.updateMediaStatus).toHaveBeenCalledWith({
        mediaId: 'm1',
        status: 'READY',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call mediaExists', async () => {
      mediaClient.exists.mockResolvedValue({ exists: true } as any);

      const res = await resolver.mediaExists('m1');
      expect(mediaClient.exists).toHaveBeenCalledWith('m1');
      expect(res).toEqual({ exists: true });
    });

    it('should call mediaByPath', async () => {
      mediaClient.getMediaByPath.mockResolvedValue({ id: 'm1' } as any);

      const res = await resolver.mediaByPath('/img.jpg');
      expect(mediaClient.getMediaByPath).toHaveBeenCalledWith('/img.jpg');
      expect(res).toEqual({ id: 'm1' });
    });
  });
});
