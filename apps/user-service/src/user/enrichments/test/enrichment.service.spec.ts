import { Test, TestingModule } from '@nestjs/testing';
import { UserEnrichmentService } from '../enrichment.service';
import { MediaGrpcClient } from 'libs/grpc-clients/src';

describe('UserEnrichmentService', () => {
  let service: UserEnrichmentService;
  let mediaClient: jest.Mocked<MediaGrpcClient>;

  beforeEach(async () => {
    const mockMediaClient = {
      getMediaByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEnrichmentService,
        { provide: MediaGrpcClient, useValue: mockMediaClient },
      ],
    }).compile();

    service = module.get<UserEnrichmentService>(UserEnrichmentService);
    mediaClient = module.get(MediaGrpcClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array if empty profiles array is passed', async () => {
    const result = await service.enrichProfilesWithMedia([]);
    expect(result).toEqual([]);
    expect(mediaClient.getMediaByIds).not.toHaveBeenCalled();
  });

  it('should enrich profiles with avatar and cover media', async () => {
    const profiles = [
      {
        id: 'u1',
        avatarMediaId: 'm1',
        coverMediaId: 'm2',
        birthDate: '2000-01-01T00:00:00.000Z',
        createdAt: new Date('2026-01-01'),
        bio: 'Hello world',
      },
    ];

    mediaClient.getMediaByIds.mockResolvedValue({
      media: [
        {
          id: 'm1',
          mediumUrl: 'media/avatar.png',
          mimeType: 'image/png',
          type: 'IMAGE',
        },
        {
          id: 'm2',
          path: 'https://cdn.example.com/cover.jpg',
          mimeType: 'image/jpeg',
          type: 'IMAGE',
        },
      ],
    } as any);

    const enriched = (await service.enrichProfilesWithMedia(profiles)) as any[];
    expect(enriched).toHaveLength(1);
    expect(enriched[0].avatar).toEqual({
      id: 'm1',
      url: 'http://localhost:4009/media/avatar.png',
      mimeType: 'image/png',
      type: 'IMAGE',
    });
    expect(enriched[0].coverImg).toEqual({
      id: 'm2',
      url: 'https://cdn.example.com/cover.jpg',
      mimeType: 'image/jpeg',
      type: 'IMAGE',
    });
  });

  it('should fallback gracefully if mediaClient throws an error', async () => {
    const profiles = [
      {
        id: 'u1',
        avatarMediaId: 'm1',
        birthDate: 'invalid-date',
      },
    ];

    mediaClient.getMediaByIds.mockRejectedValue(new Error('gRPC error'));

    const enriched = (await service.enrichProfilesWithMedia(profiles)) as any[];
    expect(enriched).toHaveLength(1);
    expect(enriched[0].avatar).toBeNull();
    expect(enriched[0].coverImg).toBeNull();
  });
});
