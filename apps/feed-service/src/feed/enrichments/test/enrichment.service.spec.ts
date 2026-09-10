import { Test, TestingModule } from '@nestjs/testing';
import { FeedEnrichmentService } from '../enrichment.service';
import { UserGrpcClient } from '@app/clients/clients/user-grpc.client';
import { MediaGrpcClient } from '@app/clients/clients/media-grpc.clinet';

describe('FeedEnrichmentService', () => {
  let service: FeedEnrichmentService;
  let mockUserClient: any;
  let mockMediaClient: any;

  beforeEach(async () => {
    mockUserClient = {};
    mockMediaClient = {
      getMediaByIds: jest.fn().mockResolvedValue({ media: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedEnrichmentService,
        { provide: UserGrpcClient, useValue: mockUserClient },
        { provide: MediaGrpcClient, useValue: mockMediaClient },
      ],
    }).compile();

    service = module.get<FeedEnrichmentService>(FeedEnrichmentService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrichPosts', () => {
    it('should return empty array if posts is empty', async () => {
      const res = await service.enrichPosts([]);
      expect(res).toEqual([]);
      expect(mockMediaClient.getMediaByIds).not.toHaveBeenCalled();
    });

    it('should resolve media IDs using mediaClient and compile enriched post structure', async () => {
      mockMediaClient.getMediaByIds.mockResolvedValue({
        media: [
          {
            id: 'm1',
            originalUrl: 'http://cdn.com/image.png',
            mimeType: 'image/png',
            type: 'IMAGE',
          },
        ],
      });

      const posts = [
        {
          id: 'p1',
          content: 'Hello World',
          mediaIds: ['m1'],
          likesCount: 5,
          author: {
            id: 'u1',
            username: 'alice',
            fullName: 'Alice Smith',
            avatar: 'alice.png',
            verified: true,
          },
        },
      ];

      const enriched = await service.enrichPosts(posts);

      expect(mockMediaClient.getMediaByIds).toHaveBeenCalledWith(['m1']);
      expect(enriched).toEqual([
        {
          id: 'p1',
          content: 'Hello World',
          feeling: '',
          location: '',
          likesCount: 5,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          isLiked: false,
          isBookmarked: false,
          createdAt: '',
          author: {
            id: 'u1',
            username: 'alice',
            fullName: 'Alice Smith',
            avatar: 'alice.png',
            verified: true,
          },
          media: [
            {
              id: 'm1',
              url: 'http://cdn.com/image.png',
              mimeType: 'image/png',
              type: 'IMAGE',
            },
          ],
        },
      ]);
    });

    it('should resolve relative media candidate paths using MEDIA_HTTP_BASE_URL', async () => {
      process.env.MEDIA_HTTP_BASE_URL = 'http://localhost:4009';
      mockMediaClient.getMediaByIds.mockResolvedValue({
        media: [
          {
            id: 'm2',
            path: 'uploads/pic.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      });

      const posts = [{ id: 'p2', mediaIds: ['m2'] }];
      const enriched = await service.enrichPosts(posts);

      expect(enriched[0].media[0].url).toBe(
        'http://localhost:4009/media/uploads/pic.jpg',
      );
    });

    it('should fallback to inline post.media if resolvedMedia is empty', async () => {
      mockMediaClient.getMediaByIds.mockResolvedValue({ media: [] });

      const posts = [
        {
          id: 'p3',
          media: [{ id: 'inline1', url: 'http://inline.com/img.png' }],
        },
      ];

      const enriched = await service.enrichPosts(posts);

      expect(enriched[0].media).toEqual([
        {
          id: 'inline1',
          url: 'http://inline.com/img.png',
          mimeType: '',
          type: 'IMAGE',
        },
      ]);
    });

    it('should log warning and handle media fetch failure gracefully', async () => {
      mockMediaClient.getMediaByIds.mockRejectedValue(
        new Error('Media gRPC error'),
      );

      const posts = [{ id: 'p1', mediaIds: ['m1'] }];
      const res = await service.enrichPosts(posts);

      expect(res[0].id).toBe('p1');
      expect(res[0].media).toEqual([]);
    });

    it('should catch unhandled errors and return original posts array', async () => {
      const invalidPosts: any = [null];
      const res = await service.enrichPosts(invalidPosts);

      expect(res).toEqual(invalidPosts);
    });
  });
});
