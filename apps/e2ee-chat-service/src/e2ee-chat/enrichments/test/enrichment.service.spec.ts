import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatEnrichmentService } from '../enrichment.service';
import { MediaGrpcClient, UserGrpcClient } from 'libs/grpc-clients/src';

describe('E2eeChatEnrichmentService', () => {
  let service: E2eeChatEnrichmentService;
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
        E2eeChatEnrichmentService,
        { provide: MediaGrpcClient, useValue: mediaClient },
        { provide: UserGrpcClient, useValue: userClient },
      ],
    }).compile();

    service = module.get<E2eeChatEnrichmentService>(E2eeChatEnrichmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrichMessages', () => {
    it('should enrich messages with sender details and attachment media metadata', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u1', name: 'User 1' }],
      });

      mediaClient.getMediaByIds.mockResolvedValue({
        media: [
          { id: 'm1', originalUrl: 'https://cdn.example.com/file1.png' },
          { id: 'm2', path: 'files/file2.png' },
        ],
      });

      const messages = [
        {
          id: 'msg1',
          senderId: 'u1',
          attachments: [{ mediaId: 'm1' }, { mediaId: 'm2' }],
        },
      ];

      const enriched: any[] = await service.enrichMessages(messages);

      expect(enriched[0].sender).toEqual({ id: 'u1', name: 'User 1' });
      expect(enriched[0].attachments).toHaveLength(2);
      expect(enriched[0].attachments[0].media.url).toBe(
        'https://cdn.example.com/file1.png',
      );
      expect(enriched[0].attachments[1].media.url).toBe(
        'http://localhost:4009/media/files/file2.png',
      );
    });

    it('should return original messages if array is empty', async () => {
      const res = await service.enrichMessages([]);
      expect(res).toEqual([]);
    });

    it('should handle errors from user and media clients gracefully', async () => {
      userClient.getUsersByIds.mockRejectedValue(new Error('User error'));
      mediaClient.getMediaByIds.mockRejectedValue(new Error('Media error'));

      const messages = [
        { id: 'm1', senderId: 'u1', attachments: [{ mediaId: 'm1' }] },
      ];
      const enriched: any[] = await service.enrichMessages(messages);

      expect(enriched[0].sender).toBeNull();
      expect(enriched[0].attachments[0].media).toBeNull();
    });
  });

  describe('enrichConversations', () => {
    it('should enrich direct conversation peer profile', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u2', name: 'User 2' }],
      });

      const conversations = [
        { id: 'c1', type: 'DIRECT', participantIds: ['u1', 'u2'] },
      ];

      const enriched: any[] = await service.enrichConversations(
        conversations,
        'u1',
      );

      expect(enriched[0].user).toEqual({ id: 'u2', name: 'User 2' });
    });

    it('should enrich group conversation members profile', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u2', name: 'User 2' }],
      });

      const conversations = [
        {
          id: 'c2',
          type: 'GROUP',
          members: [{ userId: 'u2', role: 'MEMBER' }],
        },
      ];

      const enriched: any[] = await service.enrichConversations(
        conversations,
        'u1',
      );

      expect(enriched[0].members[0].user).toEqual({ id: 'u2', name: 'User 2' });
    });

    it('should return empty if empty input passed', async () => {
      const res = await service.enrichConversations([], 'u1');
      expect(res).toEqual([]);
    });
  });

  describe('enrichConversation and enrichMessage helpers', () => {
    it('enrichConversation should enrich single conversation', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u2', name: 'User 2' }],
      });

      const res: any = await service.enrichConversation(
        { id: 'c1', type: 'DIRECT', participantIds: ['u1', 'u2'] },
        'u1',
      );
      expect(res.user).toEqual({ id: 'u2', name: 'User 2' });
    });

    it('enrichMessage should enrich single message', async () => {
      userClient.getUsersByIds.mockResolvedValue({
        users: [{ id: 'u1', name: 'User 1' }],
      });

      const res: any = await service.enrichMessage({
        id: 'msg1',
        senderId: 'u1',
      });
      expect(res.sender).toEqual({ id: 'u1', name: 'User 1' });
    });
  });
});
