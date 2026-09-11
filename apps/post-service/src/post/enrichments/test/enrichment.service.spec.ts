import { Test, TestingModule } from '@nestjs/testing';
import { PostEnrichmentService } from '../enrichment.service';
import { MediaGrpcClient, UserGrpcClient } from '@app/grpc-clients';

describe('PostEnrichmentService', () => {
  let service: PostEnrichmentService;
  let mediaClient: jest.Mocked<MediaGrpcClient>;
  let userClient: jest.Mocked<UserGrpcClient>;

  beforeEach(async () => {
    const mockMediaClient = {
      getMediaByIds: jest.fn(),
    };

    const mockUserClient = {
      getUsersByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostEnrichmentService,
        { provide: MediaGrpcClient, useValue: mockMediaClient },
        { provide: UserGrpcClient, useValue: mockUserClient },
      ],
    }).compile();

    service = module.get<PostEnrichmentService>(PostEnrichmentService);
    mediaClient = module.get(MediaGrpcClient);
    userClient = module.get(UserGrpcClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrichPosts', () => {
    it('should return empty array if empty posts array passed', async () => {
      const res = await service.enrichPosts([]);
      expect(res).toEqual([]);
      expect(userClient.getUsersByIds).not.toHaveBeenCalled();
    });

    it('should enrich posts with author and media details', async () => {
      const posts = [
        {
          id: 'p1',
          userId: 'u1',
          mediaIds: ['m1'],
        },
      ];

      userClient.getUsersByIds.mockResolvedValue({
        users: [
          {
            id: 'u1',
            email: 'john@example.com',
            name: 'John Doe',
            isVerified: true,
            avatar: { url: 'http://localhost:4009/media/avatar.png' },
          },
        ],
      } as any);

      mediaClient.getMediaByIds.mockResolvedValue({
        media: [
          {
            id: 'm1',
            mediumUrl: 'http://localhost:4009/media/post1.png',
            type: 'IMAGE',
            mimeType: 'image/png',
          },
        ],
      } as any);

      const [enriched] = (await service.enrichPosts(posts)) as any[];
      expect(enriched.author).toEqual({
        id: 'u1',
        username: 'john',
        fullName: 'John Doe',
        avatar: 'http://localhost:4009/media/avatar.png',
        verified: true,
      });
      expect(enriched.media).toEqual([
        {
          id: 'm1',
          url: 'http://localhost:4009/media/post1.png',
          type: 'IMAGE',
          mimeType: 'image/png',
        },
      ]);
    });

    it('should handle single enrichPost call', async () => {
      userClient.getUsersByIds.mockResolvedValue({ users: [] } as any);
      mediaClient.getMediaByIds.mockResolvedValue({ media: [] } as any);

      const post = { id: 'p1', userId: 'u1' };
      const enriched = await service.enrichPost(post);
      expect(enriched.id).toBe('p1');
    });

    it('should attach author: null and media: [] if gRPC call fails', async () => {
      userClient.getUsersByIds.mockRejectedValue(new Error('User gRPC error'));

      const posts = [{ id: 'p1', userId: 'u1' }];
      const res = await service.enrichPosts(posts);
      expect(res).toEqual([
        { id: 'p1', userId: 'u1', author: null, media: [] },
      ]);
    });
  });

  describe('enrichComments', () => {
    it('should return empty array if empty comments passed', async () => {
      const res = await service.enrichComments([]);
      expect(res).toEqual([]);
    });

    it('should enrich comments with author info', async () => {
      const comments = [{ id: 'c1', userId: 'u1', text: 'Nice post' }];

      userClient.getUsersByIds.mockResolvedValue({
        users: [
          {
            id: 'u1',
            email: 'jane@example.com',
            name: 'Jane',
            isVerified: false,
          },
        ],
      } as any);

      const [enriched] = (await service.enrichComments(comments)) as any[];
      expect(enriched.author).toEqual({
        id: 'u1',
        username: 'jane',
        fullName: 'Jane',
        avatar: '',
        verified: false,
      });
    });

    it('should attach author: null if userClient fails', async () => {
      userClient.getUsersByIds.mockRejectedValue(new Error('gRPC failure'));

      const comments = [{ id: 'c1', userId: 'u1' }];
      const res = await service.enrichComments(comments);
      expect(res).toEqual([{ id: 'c1', userId: 'u1', author: null }]);
    });
  });
});
