import { Test, TestingModule } from '@nestjs/testing';
import { ChatEnrichmentService } from '../enrichment.service';
import { MediaGrpcClient } from '@app/clients/clients/media-grpc.clinet';
import { UserGrpcClient } from '@app/clients/clients/user-grpc.client';

describe('ChatEnrichmentService', () => {
  let service: ChatEnrichmentService;
  let mediaClient: any;
  let userClient: any;

  beforeEach(async () => {
    mediaClient = {
      getMediaByIds: jest.fn().mockResolvedValue({ media: [] }),
    };

    userClient = {
      getUsersByIds: jest.fn().mockResolvedValue({ users: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatEnrichmentService,
        { provide: MediaGrpcClient, useValue: mediaClient },
        { provide: UserGrpcClient, useValue: userClient },
      ],
    })
      .overrideProvider(UserGrpcClient)
      .useValue(userClient)
      .compile();

    service = module.get<ChatEnrichmentService>(ChatEnrichmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrichMessages', () => {
    it('should enrich messages with sender details and media objects', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u1', name: 'User 1' }],
      });

      mediaClient.getMediaByIds.mockResolvedValue({
        media: [
          { id: 'm1', originalUrl: 'https://example.com/img.png' },
          { id: 'm2', path: 'images/img2.png' },
        ],
      });

      const messages = [
        { id: 'msg1', senderId: 'u1', mediaIds: ['m1', 'm2'] },
        { id: 'msg2', senderId: 'u2', mediaIds: [] },
      ];

      const enriched: any[] = await service.enrichMessages(messages);

      expect(enriched[0].sender).toEqual({ id: 'u1', name: 'User 1' });
      expect(enriched[0].media).toHaveLength(2);
      expect(enriched[0].media[0].url).toBe('https://example.com/img.png');
      expect(enriched[0].media[1].url).toBe(
        'http://localhost:4009/media/images/img2.png',
      );
      expect(enriched[1].sender).toBeNull();
      expect(enriched[1].media).toEqual([]);
    });

    it('should handle errors in userClient and mediaClient gracefully', async () => {
      userClient.getUsersByIds.mockRejectedValue(
        new Error('User service error'),
      );
      mediaClient.getMediaByIds.mockRejectedValue(
        new Error('Media service error'),
      );

      const messages = [{ id: 'msg1', senderId: 'u1', mediaIds: ['m1'] }];
      const enriched: any[] = await service.enrichMessages(messages);

      expect(enriched[0].sender).toBeNull();
      expect(enriched[0].media).toEqual([]);
    });
  });

  describe('enrichConversations', () => {
    it('should enrich direct conversations with the other participant details', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u2', name: 'Other User' }],
      });

      const conversations = [
        { id: 'c1', type: 'direct', participants: ['u1', 'u2'] },
      ];

      const enriched: any[] = await service.enrichConversations(
        conversations,
        'u1',
      );

      expect(enriched[0].user).toEqual({ id: 'u2', name: 'Other User' });
    });

    it('should enrich group conversations with member user details', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [
          { id: 'u2', name: 'User 2' },
          { id: 'u3', name: 'User 3' },
        ],
      });

      const conversations = [
        { id: 'c2', type: 'group', participants: ['u1', 'u2', 'u3'] },
      ];

      const enriched: any[] = await service.enrichConversations(
        conversations,
        'u1',
      );

      expect(enriched[0].members).toHaveLength(2);
      expect(enriched[0].members[0]).toEqual({ id: 'u2', name: 'User 2' });
    });
  });
});
