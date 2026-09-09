import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from '../chat.service';
import { Message } from '../../schemas/message.schema';
import { Conversation } from '../../schemas/conversation.schema';
import { ChatRedisService } from '../../redis/redis.service';
import { ChatEnrichmentService } from '../enrichments/enrichment.service';
import { KafkaService } from '@app/kafka';

describe('ChatService', () => {
  let service: ChatService;
  let messageModel: any;
  let conversationModel: any;
  let redis: any;
  let enrichment: any;
  let kafka: any;

  beforeEach(async () => {
    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
    };

    conversationModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    redis = {
      getOnlineUsers: jest.fn().mockResolvedValue(new Set()),
      getUnreadCount: jest.fn().mockResolvedValue(0),
      setUnreadCount: jest.fn().mockResolvedValue(undefined),
      clearUnread: jest.fn().mockResolvedValue(undefined),
      invalidateMessageCache: jest.fn().mockResolvedValue(undefined),
      getRecentMessages: jest.fn().mockResolvedValue(null),
      cacheRecentMessages: jest.fn().mockResolvedValue(undefined),
    };

    enrichment = {
      enrichConversations: jest.fn().mockImplementation((convs) => convs),
      enrichMessages: jest.fn().mockImplementation((msgs) => msgs),
    };

    kafka = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Message.name), useValue: messageModel },
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
        { provide: ChatRedisService, useValue: redis },
        { provide: ChatEnrichmentService, useValue: enrichment },
        { provide: KafkaService, useValue: kafka },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      const existingConv = {
        id: 'c1',
        type: 'direct',
        participants: ['u1', 'u2'],
      };
      conversationModel.findOne.mockResolvedValue(existingConv);

      const result = await service.getOrCreateConversation('u1', 'u2');
      expect(result).toBe(existingConv);
    });

    it('should create new conversation if not exists', async () => {
      conversationModel.findOne.mockResolvedValue(null);
      const newConv = { id: 'c2', type: 'direct', participants: ['u1', 'u2'] };
      conversationModel.create.mockResolvedValue(newConv);

      const result = await service.getOrCreateConversation('u1', 'u2');
      expect(conversationModel.create).toHaveBeenCalled();
      expect(result).toBe(newConv);
    });
  });

  describe('createGroup', () => {
    it('should create group conversation and emit kafka event', async () => {
      const groupConv = {
        id: 'g1',
        name: 'Test Group',
        avatar: '',
        participants: ['u1', 'u2'],
      };
      conversationModel.create.mockResolvedValue(groupConv);

      const result = await service.createGroup({
        name: 'Test Group',
        creatorId: 'u1',
        participantIds: ['u2'],
      });

      expect(conversationModel.create).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalled();
      expect(result).toBe(groupConv);
    });
  });

  describe('getConversation', () => {
    it('should return conversation if user is participant', async () => {
      const conv = { _id: 'c1', participants: ['u1'] };
      conversationModel.findOne.mockResolvedValue(conv);

      const res = await service.getConversation('c1', 'u1');
      expect(res).toBe(conv);
    });

    it('should throw error if conversation not found', async () => {
      conversationModel.findOne.mockResolvedValue(null);
      await expect(service.getConversation('c1', 'u1')).rejects.toThrow(
        'Conversation not found',
      );
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations with unread counts and online status', async () => {
      const convList = [
        {
          _id: { toString: () => 'c1' },
          type: 'direct',
          participants: ['u1', 'u2'],
          members: [{ userId: 'u1', unreadCount: 2 }],
        },
      ];

      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(convList),
      };

      conversationModel.find.mockReturnValue(chain);
      conversationModel.countDocuments.mockResolvedValue(1);
      redis.getOnlineUsers.mockResolvedValue(new Set(['u2']));

      const res = await service.getConversations('u1', 1, 10);
      expect(res.total).toBe(1);
      expect(res.conversations).toHaveLength(1);
      expect(res.conversations[0].isOnline).toBe(true);
    });
  });

  describe('Group Member Management', () => {
    it('should add group member', async () => {
      conversationModel.findOne.mockResolvedValue({
        _id: 'g1',
        type: 'group',
        members: [],
      });

      await service.addGroupMember('g1', 'admin1', 'user2', 'MEMBER');

      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalled();
    });

    it('should throw error when adding member to invalid group', async () => {
      conversationModel.findOne.mockResolvedValue(null);
      await expect(
        service.addGroupMember('g1', 'admin1', 'user2'),
      ).rejects.toThrow('Group not found or unauthorized');
    });

    it('should remove group member', async () => {
      conversationModel.findOne.mockResolvedValue({ _id: 'g1', name: 'G' });
      await service.removeGroupMember('g1', 'admin1', 'user2');
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalled();
    });

    it('should leave group', async () => {
      conversationModel.findOne.mockResolvedValue({ _id: 'g1', name: 'G' });
      await service.leaveGroup('g1', 'user1');
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(kafka.emit).toHaveBeenCalled();
    });

    it('should update member role', async () => {
      conversationModel.findOne.mockResolvedValue({ _id: 'g1' });
      await service.updateMemberRole('g1', 'admin1', 'user2', 'ADMIN');
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('Conversation Customizations (Mute, Archive, Pin)', () => {
    it('should mute conversation for user', async () => {
      conversationModel.findOne.mockResolvedValue({
        _id: 'c1',
        members: [{ userId: 'u1', muted: false }],
      });
      await service.muteConversation('c1', 'u1', true);
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should archive conversation for user', async () => {
      conversationModel.findOne.mockResolvedValue({
        _id: 'c1',
        members: [{ userId: 'u1', archived: false }],
      });
      await service.archiveConversation('c1', 'u1', true);
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should pin conversation for user', async () => {
      conversationModel.findOne.mockResolvedValue({
        _id: 'c1',
        members: [],
      });
      await service.pinConversation('c1', 'u1', true);
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should throw error if conversation not found', async () => {
      conversationModel.findById.mockResolvedValue(null);
      await expect(
        service.sendMessage({
          conversationId: 'c1',
          senderId: 'u1',
          senderName: 'U1',
          text: 'Hello',
        }),
      ).rejects.toThrow('Conversation not found');
    });

    it('should send message, update conversation, emit kafka and invalidate cache', async () => {
      conversationModel.findById.mockResolvedValue({
        _id: 'c1',
        participants: ['u1', 'u2'],
        unreadCounts: { u2: 0 },
      });

      const createdMsg = {
        id: 'm1',
        conversationId: 'c1',
        toObject: () => ({ id: 'm1', text: 'Hello' }),
      };
      messageModel.create.mockResolvedValue(createdMsg);

      const res = await service.sendMessage({
        conversationId: 'c1',
        senderId: 'u1',
        senderName: 'U1',
        text: 'Hello',
      });

      expect(messageModel.create).toHaveBeenCalled();
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(redis.setUnreadCount).toHaveBeenCalledWith('u2', 'c1', 1);
      expect(kafka.emit).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });

  describe('getMessages', () => {
    it('should return cached messages on page 1 without before/after filters', async () => {
      redis.getRecentMessages.mockResolvedValue([{ id: 'm1', text: 'cached' }]);
      const res = await service.getMessages('c1', 'u1', 1, 20);
      expect(res.messages).toHaveLength(1);
      expect(res.messages[0].text).toBe('cached');
    });

    it('should fetch messages from DB if cache miss', async () => {
      redis.getRecentMessages.mockResolvedValue(null);
      const dbMsgs = [
        {
          _id: { toString: () => 'm1' },
          conversationId: 'c1',
          senderId: 'u1',
          text: 'hi',
          mediaIds: [],
        },
      ];
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(dbMsgs),
      };

      messageModel.find.mockReturnValue(chain);
      messageModel.countDocuments.mockResolvedValue(1);

      const res = await service.getMessages('c1', 'u1', 1, 20);
      expect(res.messages).toHaveLength(1);
      expect(redis.cacheRecentMessages).toHaveBeenCalled();
    });
  });

  describe('editMessage', () => {
    it('should throw error if message not found', async () => {
      messageModel.findOne.mockResolvedValue(null);
      await expect(service.editMessage('m1', 'u1', 'new text')).rejects.toThrow(
        'Message not found or unauthorized',
      );
    });

    it('should update message text and invalidate cache', async () => {
      messageModel.findOne.mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
      });
      const updatedMsg = {
        _id: 'm1',
        text: 'new text',
        toObject: () => ({ id: 'm1', text: 'new text' }),
      };
      messageModel.findByIdAndUpdate.mockResolvedValue(updatedMsg);

      const res = await service.editMessage('m1', 'u1', 'new text');
      expect(redis.invalidateMessageCache).toHaveBeenCalledWith('c1');
      expect(res).toBeDefined();
    });
  });

  describe('deleteMessage', () => {
    it('should throw error if message does not exist', async () => {
      messageModel.findById.mockResolvedValue(null);
      await expect(service.deleteMessage('m1', 'u1')).rejects.toThrow(
        'Message not found',
      );
    });

    it('should delete message for user', async () => {
      messageModel.findById.mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
      });
      await service.deleteMessage('m1', 'u1', false);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('m1', {
        $addToSet: { deletedFor: 'u1' },
      });
      expect(redis.invalidateMessageCache).toHaveBeenCalledWith('c1');
    });

    it('should throw error if user tries to delete for everyone without ownership', async () => {
      messageModel.findById.mockResolvedValue({
        _id: 'm1',
        senderId: 'otherUser',
        conversationId: 'c1',
      });
      await expect(service.deleteMessage('m1', 'u1', true)).rejects.toThrow(
        'Unauthorized to delete message for everyone',
      );
    });

    it('should delete message for everyone if user is sender', async () => {
      messageModel.findById.mockResolvedValue({
        _id: 'm1',
        senderId: 'u1',
        conversationId: 'c1',
      });
      await service.deleteMessage('m1', 'u1', true);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('m1', {
        $set: { isDeleted: true, text: 'This message was deleted' },
      });
    });
  });

  describe('forwardMessage', () => {
    it('should forward message content to target conversation', async () => {
      messageModel.findById.mockResolvedValue({
        _id: { toString: () => 'm1' },
        text: 'Forwarded content',
        mediaIds: [],
        type: 'text',
      });

      conversationModel.findById.mockResolvedValue({
        _id: 'c2',
        participants: ['u1', 'u3'],
      });

      messageModel.create.mockResolvedValue({
        id: 'm2',
        conversationId: 'c2',
        toObject: () => ({ id: 'm2', text: 'Forwarded content' }),
      });

      const res = await service.forwardMessage({
        sourceMessageId: 'm1',
        targetConversationId: 'c2',
        senderId: 'u1',
      });

      expect(res).toBeDefined();
    });
  });

  describe('markReceipt and markAsRead', () => {
    it('should mark receipt', async () => {
      messageModel.findById.mockResolvedValue({ _id: 'm1' });
      await service.markReceipt('m1', 'u1', 'DELIVERED');
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should mark conversation as read', async () => {
      await service.markAsRead('c1', 'u1');
      expect(messageModel.updateMany).toHaveBeenCalled();
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(redis.clearUnread).toHaveBeenCalledWith('u1', 'c1');
    });
  });

  describe('reactToMessage', () => {
    it('should add or remove reaction emoji on message', async () => {
      const msg = {
        _id: 'm1',
        conversationId: 'c1',
        reactions: {},
      };
      messageModel.findById.mockResolvedValue(msg);
      messageModel.findByIdAndUpdate.mockResolvedValue({
        ...msg,
        reactions: { '👍': ['u1'] },
      });

      const res = await service.reactToMessage('m1', 'u1', '👍');
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(redis.invalidateMessageCache).toHaveBeenCalledWith('c1');
      expect(res).toBeDefined();
    });
  });

  describe('pinMessage', () => {
    it('should pin message', async () => {
      messageModel.findOne.mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
      });
      await service.pinMessage('c1', 'm1', 'u1', true);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('m1', {
        $addToSet: { pinnedBy: 'u1' },
      });
    });

    it('should unpin message', async () => {
      messageModel.findOne.mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
      });
      await service.pinMessage('c1', 'm1', 'u1', false);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('m1', {
        $pull: { pinnedBy: 'u1' },
      });
    });
  });

  describe('getUnreadCounts and getGroupMembersForNotif', () => {
    it('should return unread counts summary', async () => {
      conversationModel.find.mockResolvedValue([
        { _id: { toString: () => 'c1' }, unreadCounts: { u1: 3 } },
      ]);

      const res = await service.getUnreadCounts('u1');
      expect(res.success).toBe(true);
      expect(res.totalUnread).toBe(3);
    });

    it('should return group members info for notifications', async () => {
      conversationModel.findById.mockResolvedValue({
        _id: 'c1',
        name: 'Group 1',
        avatar: '',
        participants: ['u1', 'u2'],
        members: [
          { userId: 'u1', muted: false },
          { userId: 'u2', muted: true },
        ],
      });

      const res = await service.getGroupMembersForNotif('c1');
      expect(res.success).toBe(true);
      expect(res.members).toHaveLength(2);
    });
  });
});
