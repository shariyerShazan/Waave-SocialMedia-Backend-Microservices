import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatService } from '../e2ee-chat.service';
import { E2eeChatPrismaService } from '../../prisma/prisma.service';
import { E2eeChatRedisService } from '../../redis/redis.service';
import { E2eeChatEnrichmentService } from '../enrichments/enrichment.service';
import { KafkaService } from '@app/kafka';

describe('E2eeChatService', () => {
  let service: E2eeChatService;
  let prisma: any;
  let redis: any;
  let enrichment: any;
  let kafka: any;

  beforeEach(async () => {
    prisma = {
      readDb: {
        conversation: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        conversationMember: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
        encryptedMessage: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      },
      writeDb: {
        conversation: {
          create: jest.fn(),
          update: jest.fn(),
        },
        conversationMember: {
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          upsert: jest.fn(),
        },
        encryptedMessage: {
          create: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((cb) => cb(prisma.writeDb)),
        messageReceipt: {
          upsert: jest.fn(),
        },
        messageReaction: {
          upsert: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    redis = {
      getOnlineUsers: jest.fn().mockResolvedValue(new Set()),
      getUnreadCount: jest.fn().mockResolvedValue(0),
      setUnreadCount: jest.fn().mockResolvedValue(undefined),
      clearUnread: jest.fn().mockResolvedValue(undefined),
      invalidateMessageCache: jest.fn().mockResolvedValue(undefined),
      getRecentMessages: jest.fn().mockResolvedValue(null),
      cacheRecentMessages: jest.fn().mockResolvedValue(undefined),
      setGroupNotifMembers: jest.fn().mockResolvedValue(undefined),
      getGroupNotifMembers: jest.fn().mockResolvedValue(null),
      invalidateGroupNotifMembers: jest.fn().mockResolvedValue(undefined),
      incrUnread: jest.fn().mockResolvedValue(undefined),
    };

    enrichment = {
      enrichConversation: jest.fn().mockImplementation((conv) => conv),
      enrichConversations: jest.fn().mockImplementation((convs) => convs),
      enrichMessage: jest.fn().mockImplementation((msg) => msg),
      enrichMessages: jest.fn().mockImplementation((msgs) => msgs),
    };

    kafka = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eeChatService,
        { provide: E2eeChatPrismaService, useValue: prisma },
        { provide: E2eeChatRedisService, useValue: redis },
        { provide: E2eeChatEnrichmentService, useValue: enrichment },
        { provide: KafkaService, useValue: kafka },
      ],
    }).compile();

    service = module.get<E2eeChatService>(E2eeChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateDirectConversation', () => {
    it('should throw error if user creates conversation with self', async () => {
      await expect(
        service.getOrCreateDirectConversation('u1', 'u1'),
      ).rejects.toThrow();
    });

    it('should return existing conversation if found', async () => {
      const conv = {
        id: 'c1',
        type: 'DIRECT',
        createdBy: 'u1',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.readDb.conversation.findUnique.mockResolvedValue(conv);

      const result = await service.getOrCreateDirectConversation('u1', 'u2');
      expect(result.success).toBe(true);
      expect(result.conversation).toBeDefined();
    });

    it('should create direct conversation if not exists', async () => {
      prisma.readDb.conversation.findUnique.mockResolvedValue(null);
      const conv = {
        id: 'c2',
        type: 'DIRECT',
        createdBy: 'u1',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.writeDb.conversation.create.mockResolvedValue(conv);

      const result = await service.getOrCreateDirectConversation('u1', 'u2');
      expect(result.success).toBe(true);
      expect(prisma.writeDb.conversation.create).toHaveBeenCalled();
    });
  });

  describe('createGroup', () => {
    it('should throw error if participants count < 2', async () => {
      await expect(
        service.createGroup({
          name: 'Group',
          creatorId: 'u1',
          participantIds: [],
        }),
      ).rejects.toThrow();
    });

    it('should create group and emit kafka event', async () => {
      const groupConv = {
        id: 'g1',
        type: 'GROUP',
        name: 'Group 1',
        createdBy: 'u1',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.writeDb.conversation.create.mockResolvedValue(groupConv);

      const result = await service.createGroup({
        name: 'Group 1',
        creatorId: 'u1',
        participantIds: ['u2'],
      });

      expect(result.success).toBe(true);
      expect(kafka.emit).toHaveBeenCalled();
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      const memberships = [
        {
          userId: 'u1',
          unreadCount: 1,
          muted: false,
          archived: false,
          pinned: false,
          conversation: {
            id: 'c1',
            type: 'DIRECT',
            members: [{ userId: 'u1' }, { userId: 'u2' }],
          },
        },
      ];

      prisma.readDb.conversationMember.findMany.mockResolvedValue(memberships);
      prisma.readDb.conversationMember.count.mockResolvedValue(1);

      const res = await service.getConversations('u1', 1, 10);
      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
    });
  });

  describe('getConversation', () => {
    it('should throw error if user is not member', async () => {
      prisma.readDb.conversationMember.findFirst.mockResolvedValue(null);
      await expect(service.getConversation('c1', 'u1')).rejects.toThrow();
    });

    it('should return conversation if user is active member', async () => {
      prisma.readDb.conversationMember.findFirst.mockResolvedValue({
        id: 'm1',
      });
      prisma.readDb.conversation.findFirst.mockResolvedValue({
        id: 'c1',
        type: 'DIRECT',
        createdBy: 'u1',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.getConversation('c1', 'u1');
      expect(res.success).toBe(true);
    });
  });

  describe('Group Member Management', () => {
    beforeEach(() => {
      // Mock admin check to pass
      prisma.readDb.conversationMember.findFirst.mockResolvedValue({
        id: 'admin_mem',
        role: 'ADMIN',
      });
    });

    it('should add group member and emit kafka event', async () => {
      prisma.readDb.conversation.findFirst.mockResolvedValue({
        id: 'g1',
        type: 'GROUP',
        name: 'G1',
      });

      const res = await service.addGroupMember('g1', 'adminId', 'u2', 'MEMBER');
      expect(res.success).toBe(true);
      expect(prisma.writeDb.conversationMember.upsert).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalled();
    });

    it('should remove group member and emit kafka event', async () => {
      prisma.readDb.conversationMember.findUnique.mockResolvedValue({
        id: 'target_mem',
        role: 'MEMBER',
        leftAt: null,
      });

      prisma.readDb.conversation.findFirst.mockResolvedValue({
        id: 'g1',
        name: 'G1',
      });

      const res = await service.removeGroupMember('g1', 'adminId', 'u2');
      expect(res.success).toBe(true);
      expect(kafka.emit).toHaveBeenCalled();
    });

    it('should update member role', async () => {
      const res = await service.updateMemberRole(
        'g1',
        'adminId',
        'u2',
        'ADMIN',
      );
      expect(res.success).toBe(true);
      expect(prisma.writeDb.conversationMember.update).toHaveBeenCalled();
    });
  });

  describe('Customizations (Mute, Archive, Pin)', () => {
    beforeEach(() => {
      prisma.readDb.conversationMember.findFirst.mockResolvedValue({
        id: 'm1',
      });
    });

    it('should mute conversation', async () => {
      const res = await service.muteConversation('c1', 'u1', true);
      expect(res.success).toBe(true);
      expect(prisma.writeDb.conversationMember.update).toHaveBeenCalled();
    });

    it('should archive conversation', async () => {
      const res = await service.archiveConversation('c1', 'u1', true);
      expect(res.success).toBe(true);
      expect(prisma.writeDb.conversationMember.update).toHaveBeenCalled();
    });

    it('should pin conversation', async () => {
      const res = await service.pinConversation('c1', 'u1', true);
      expect(res.success).toBe(true);
      expect(prisma.writeDb.conversationMember.update).toHaveBeenCalled();
    });
  });

  describe('sendEncryptedMessage', () => {
    it('should throw error if envelopes array is empty', async () => {
      await expect(
        service.sendEncryptedMessage({
          conversationId: 'c1',
          senderId: 'u1',
          senderDeviceId: 'd1',
          type: 'text',
          envelopes: [],
        }),
      ).rejects.toThrow();
    });

    it('should create message in transaction and return message envelope', async () => {
      prisma.readDb.conversationMember.findFirst.mockResolvedValue({
        id: 'm1',
      });
      prisma.readDb.encryptedMessage.findUnique.mockResolvedValue(null);

      const createdMsg = {
        id: 'msg1',
        conversationId: 'c1',
        senderId: 'u1',
        senderDeviceId: 'd1',
        type: 'text',
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        envelopes: [
          {
            id: 'e1',
            messageId: 'msg1',
            recipientUserId: 'u2',
            recipientDeviceId: 'd2',
            ciphertext: 'cipher',
            iv: 'iv',
            authTag: 'tag',
            delivered: false,
            createdAt: new Date(),
          },
        ],
        attachments: [],
        receipts: [],
        reactions: [],
      };

      prisma.writeDb.encryptedMessage.create.mockResolvedValue(createdMsg);

      const res = await service.sendEncryptedMessage({
        conversationId: 'c1',
        senderId: 'u1',
        senderDeviceId: 'd1',
        type: 'text',
        envelopes: [
          {
            recipientUserId: 'u2',
            recipientDeviceId: 'd2',
            payload: { ciphertext: 'cipher', iv: 'iv', authTag: 'tag' },
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.encryptedMessage).toBeDefined();
    });
  });
});
