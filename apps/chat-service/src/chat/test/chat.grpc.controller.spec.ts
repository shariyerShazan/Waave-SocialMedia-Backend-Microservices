import { Test, TestingModule } from '@nestjs/testing';
import { ChatGrpcController } from '../chat.grpc.controller';
import { ChatService } from '../chat.service';

describe('ChatGrpcController', () => {
  let controller: ChatGrpcController;
  let chatService: any;

  beforeEach(async () => {
    chatService = {
      getOrCreateConversation: jest.fn().mockResolvedValue({
        _id: 'c1',
        type: 'direct',
        participants: ['u1', 'u2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      createGroup: jest.fn().mockResolvedValue({
        _id: 'g1',
        type: 'group',
        name: 'Group 1',
        participants: ['u1', 'u2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getConversation: jest.fn().mockResolvedValue({
        _id: 'c1',
        type: 'direct',
        participants: ['u1', 'u2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      addGroupMember: jest.fn().mockResolvedValue(undefined),
      removeGroupMember: jest.fn().mockResolvedValue(undefined),
      leaveGroup: jest.fn().mockResolvedValue(undefined),
      updateMemberRole: jest.fn().mockResolvedValue(undefined),
      muteConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        text: 'hello',
        createdAt: new Date(),
      }),
      getMessages: jest.fn().mockResolvedValue({
        messages: [
          {
            _id: 'm1',
            conversationId: 'c1',
            senderId: 'u1',
            text: 'hello',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        hasMore: false,
      }),
      editMessage: jest.fn().mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        text: 'edited',
        createdAt: new Date(),
      }),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      forwardMessage: jest.fn().mockResolvedValue({
        _id: 'm2',
        conversationId: 'c2',
        senderId: 'u1',
        text: 'hello',
        createdAt: new Date(),
      }),
      markReceipt: jest.fn().mockResolvedValue(undefined),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      reactToMessage: jest.fn().mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
        reactions: { '👍': ['u1'] },
        createdAt: new Date(),
      }),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      getConversations: jest.fn().mockResolvedValue({
        total: 1,
        page: 1,
        conversations: [
          {
            id: 'c1',
            type: 'direct',
            name: 'Direct',
            avatar: '',
            participants: ['u1', 'u2'],
            lastMessage: 'hi',
            lastMessageAt: new Date(),
            lastSenderId: 'u1',
            unreadCount: 0,
            isOnline: true,
            muted: false,
            archived: false,
            pinned: false,
          },
        ],
      }),
      getUnreadCounts: jest
        .fn()
        .mockResolvedValue({ success: true, items: [], totalUnread: 0 }),
      getGroupMembersForNotif: jest
        .fn()
        .mockResolvedValue({ success: true, members: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatGrpcController],
      providers: [{ provide: ChatService, useValue: chatService }],
    }).compile();

    controller = module.get<ChatGrpcController>(ChatGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getOrCreateConversation should call service and return conversation response', async () => {
    const res = await controller.getOrCreateConversation({
      userId1: 'u1',
      userId2: 'u2',
    });
    expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
      'u1',
      'u2',
    );
    expect(res.success).toBe(true);
    expect(res.conversation).toBeDefined();
  });

  it('createGroup should call service and return conversation response', async () => {
    const res = await controller.createGroup({
      name: 'Group 1',
      creatorId: 'u1',
      participantIds: ['u2'],
      avatar: '',
    });
    expect(chatService.createGroup).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  it('getConversation should call service', async () => {
    const res = await controller.getConversation({
      conversationId: 'c1',
      userId: 'u1',
    });
    expect(chatService.getConversation).toHaveBeenCalledWith('c1', 'u1');
    expect(res.success).toBe(true);
  });

  it('addGroupMember should call service', async () => {
    const res = await controller.addGroupMember({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
      role: 'MEMBER',
    });
    expect(chatService.addGroupMember).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      'MEMBER',
    );
    expect(res.success).toBe(true);
  });

  it('removeGroupMember should call service', async () => {
    const res = await controller.removeGroupMember({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
    });
    expect(chatService.removeGroupMember).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
    );
    expect(res.success).toBe(true);
  });

  it('leaveGroup should call service', async () => {
    const res = await controller.leaveGroup({
      conversationId: 'g1',
      userId: 'u1',
    });
    expect(chatService.leaveGroup).toHaveBeenCalledWith('g1', 'u1');
    expect(res.success).toBe(true);
  });

  it('updateMemberRole should call service', async () => {
    const res = await controller.updateMemberRole({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
      role: 'ADMIN',
    });
    expect(chatService.updateMemberRole).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      'ADMIN',
    );
    expect(res.success).toBe(true);
  });

  it('muteConversation should call service', async () => {
    const res = await controller.muteConversation({
      conversationId: 'c1',
      userId: 'u1',
      muted: true,
      mutedUntil: '',
    });
    expect(chatService.muteConversation).toHaveBeenCalledWith(
      'c1',
      'u1',
      true,
      '',
    );
    expect(res.success).toBe(true);
  });

  it('archiveConversation should call service', async () => {
    const res = await controller.archiveConversation({
      conversationId: 'c1',
      userId: 'u1',
      archived: true,
    });
    expect(chatService.archiveConversation).toHaveBeenCalledWith(
      'c1',
      'u1',
      true,
    );
    expect(res.success).toBe(true);
  });

  it('pinConversation should call service', async () => {
    const res = await controller.pinConversation({
      conversationId: 'c1',
      userId: 'u1',
      pinned: true,
    });
    expect(chatService.pinConversation).toHaveBeenCalledWith('c1', 'u1', true);
    expect(res.success).toBe(true);
  });

  it('sendMessage should call service and format message', async () => {
    const res = await controller.sendMessage({
      conversationId: 'c1',
      senderId: 'u1',
      senderName: 'User',
      text: 'hello',
    } as any);
    expect(chatService.sendMessage).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(res.messageData).toBeDefined();
  });

  it('getMessages should call service and return list', async () => {
    const res = await controller.getMessages({
      conversationId: 'c1',
      userId: 'u1',
      page: 1,
      limit: 10,
    });
    expect(chatService.getMessages).toHaveBeenCalledWith(
      'c1',
      'u1',
      1,
      10,
      undefined,
      undefined,
    );
    expect(res.messages).toHaveLength(1);
  });

  it('editMessage should call service', async () => {
    const res = await controller.editMessage({
      messageId: 'm1',
      senderId: 'u1',
      text: 'edited',
    });
    expect(chatService.editMessage).toHaveBeenCalledWith('m1', 'u1', 'edited');
    expect(res.success).toBe(true);
  });

  it('deleteMessage should call service', async () => {
    const res = await controller.deleteMessage({
      messageId: 'm1',
      userId: 'u1',
      forEveryone: true,
    });
    expect(chatService.deleteMessage).toHaveBeenCalledWith('m1', 'u1', true);
    expect(res.success).toBe(true);
  });

  it('forwardMessage should call service', async () => {
    const res = await controller.forwardMessage({
      sourceMessageId: 'm1',
      targetConversationId: 'c2',
      senderId: 'u1',
    });
    expect(chatService.forwardMessage).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  it('markReceipt should call service', async () => {
    const res = await controller.markReceipt({
      messageId: 'm1',
      userId: 'u1',
      status: 'DELIVERED',
    });
    expect(chatService.markReceipt).toHaveBeenCalledWith(
      'm1',
      'u1',
      'DELIVERED',
    );
    expect(res.success).toBe(true);
  });

  it('markAsRead should call service', async () => {
    const res = await controller.markAsRead({
      conversationId: 'c1',
      userId: 'u1',
    });
    expect(chatService.markAsRead).toHaveBeenCalledWith('c1', 'u1', undefined);
    expect(res.success).toBe(true);
  });

  it('reactToMessage should call service', async () => {
    const res = await controller.reactToMessage({
      messageId: 'm1',
      userId: 'u1',
      emoji: '👍',
    });
    expect(chatService.reactToMessage).toHaveBeenCalledWith('m1', 'u1', '👍');
    expect(res.success).toBe(true);
  });

  it('pinMessage should call service', async () => {
    const res = await controller.pinMessage({
      conversationId: 'c1',
      messageId: 'm1',
      userId: 'u1',
      pinned: true,
    });
    expect(chatService.pinMessage).toHaveBeenCalledWith('c1', 'm1', 'u1', true);
    expect(res.success).toBe(true);
  });

  it('getConversations should call service', async () => {
    const res = await controller.getConversations({
      userId: 'u1',
      page: 1,
      limit: 10,
    });
    expect(chatService.getConversations).toHaveBeenCalledWith(
      'u1',
      1,
      10,
      undefined,
    );
    expect(res.conversations).toHaveLength(1);
  });

  it('getUnreadCounts should call service', async () => {
    const res = await controller.getUnreadCounts({ userId: 'u1' });
    expect(chatService.getUnreadCounts).toHaveBeenCalledWith('u1');
    expect(res.success).toBe(true);
  });

  it('getGroupMembersForNotif should call service', async () => {
    const res = await controller.getGroupMembersForNotif({
      conversationId: 'c1',
    });
    expect(chatService.getGroupMembersForNotif).toHaveBeenCalledWith('c1');
    expect(res.success).toBe(true);
  });
});
