import { Test, TestingModule } from '@nestjs/testing';
import { ChatHttpController } from '../chat.http.controller';
import { ChatService } from '../chat.service';

describe('ChatHttpController', () => {
  let controller: ChatHttpController;
  let chatService: any;

  beforeEach(async () => {
    chatService = {
      getConversations: jest
        .fn()
        .mockResolvedValue({ conversations: [], total: 0, page: 1 }),
      getConversation: jest.fn().mockResolvedValue({ id: 'c1' }),
      getMessages: jest
        .fn()
        .mockResolvedValue({ messages: [], total: 0, page: 1 }),
      getOrCreateConversation: jest.fn().mockResolvedValue({ id: 'c1' }),
      createGroup: jest.fn().mockResolvedValue({ id: 'g1' }),
      addGroupMember: jest.fn().mockResolvedValue(undefined),
      removeGroupMember: jest.fn().mockResolvedValue(undefined),
      leaveGroup: jest.fn().mockResolvedValue(undefined),
      updateMemberRole: jest.fn().mockResolvedValue(undefined),
      muteConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
      editMessage: jest.fn().mockResolvedValue({ id: 'm1', text: 'edited' }),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      forwardMessage: jest.fn().mockResolvedValue({ id: 'm2' }),
      markReceipt: jest.fn().mockResolvedValue(undefined),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      reactToMessage: jest.fn().mockResolvedValue({ id: 'm1', reactions: {} }),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      getUnreadCounts: jest
        .fn()
        .mockResolvedValue({ success: true, items: [], totalUnread: 0 }),
      getGroupMembersForNotif: jest
        .fn()
        .mockResolvedValue({ success: true, members: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatHttpController],
      providers: [{ provide: ChatService, useValue: chatService }],
    }).compile();

    controller = module.get<ChatHttpController>(ChatHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getConversations should call chatService.getConversations', async () => {
    await controller.getConversations(
      { userId: 'u1' },
      { page: 1, limit: 10 },
      'true',
    );
    expect(chatService.getConversations).toHaveBeenCalledWith(
      'u1',
      1,
      10,
      true,
    );
  });

  it('getConversation should call chatService.getConversation', async () => {
    await controller.getConversation('c1', { userId: 'u1' });
    expect(chatService.getConversation).toHaveBeenCalledWith('c1', 'u1');
  });

  it('getMessages should call chatService.getMessages', async () => {
    await controller.getMessages(
      'c1',
      { userId: 'u1' },
      {
        page: 1,
        limit: 20,
      },
    );
    expect(chatService.getMessages).toHaveBeenCalledWith(
      'c1',
      'u1',
      1,
      20,
      undefined,
      undefined,
    );
  });

  it('getOrCreateConversation should call chatService.getOrCreateConversation', async () => {
    await controller.getOrCreateConversation({
      userId: 'u1',
      targetUserId: 'u2',
    });
    expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
      'u1',
      'u2',
    );
  });

  it('createGroup should call chatService.createGroup', async () => {
    await controller.createGroup({
      name: 'G1',
      userId: 'u1',
      participantIds: ['u2'],
    });
    expect(chatService.createGroup).toHaveBeenCalled();
  });

  it('addGroupMember should call chatService.addGroupMember', async () => {
    await controller.addGroupMember('g1', {
      userId: 'admin',
      userIdToAdd: 'u2',
      role: 'MEMBER',
    });
    expect(chatService.addGroupMember).toHaveBeenCalledWith(
      'g1',
      'admin',
      'u2',
      'MEMBER',
    );
  });

  it('removeGroupMember should call chatService.removeGroupMember', async () => {
    await controller.removeGroupMember('g1', 'u2', { userId: 'admin' });
    expect(chatService.removeGroupMember).toHaveBeenCalledWith(
      'g1',
      'admin',
      'u2',
    );
  });

  it('leaveGroup should call chatService.leaveGroup', async () => {
    await controller.leaveGroup('g1', { userId: 'u1' });
    expect(chatService.leaveGroup).toHaveBeenCalledWith('g1', 'u1');
  });

  it('updateMemberRole should call chatService.updateMemberRole', async () => {
    await controller.updateMemberRole('g1', 'u2', {
      userId: 'admin',
      role: 'ADMIN',
    });
    expect(chatService.updateMemberRole).toHaveBeenCalledWith(
      'g1',
      'admin',
      'u2',
      'ADMIN',
    );
  });

  it('muteConversation should call chatService.muteConversation', async () => {
    await controller.muteConversation('c1', { userId: 'u1', muted: true });
    expect(chatService.muteConversation).toHaveBeenCalledWith(
      'c1',
      'u1',
      true,
      undefined,
    );
  });

  it('archiveConversation should call chatService.archiveConversation', async () => {
    await controller.archiveConversation('c1', {
      userId: 'u1',
      archived: true,
    });
    expect(chatService.archiveConversation).toHaveBeenCalledWith(
      'c1',
      'u1',
      true,
    );
  });

  it('pinConversation should call chatService.pinConversation', async () => {
    await controller.pinConversation('c1', { userId: 'u1', pinned: true });
    expect(chatService.pinConversation).toHaveBeenCalledWith('c1', 'u1', true);
  });

  it('sendMessage should call chatService.sendMessage', async () => {
    await controller.sendMessage({
      conversationId: 'c1',
      userId: 'u1',
      text: 'Hi',
    });
    expect(chatService.sendMessage).toHaveBeenCalled();
  });

  it('editMessage should call chatService.editMessage', async () => {
    await controller.editMessage('m1', { userId: 'u1', text: 'new text' });
    expect(chatService.editMessage).toHaveBeenCalledWith(
      'm1',
      'u1',
      'new text',
    );
  });

  it('deleteMessage should call chatService.deleteMessage', async () => {
    await controller.deleteMessage('m1', { userId: 'u1' }, 'true');
    expect(chatService.deleteMessage).toHaveBeenCalledWith('m1', 'u1', true);
  });

  it('forwardMessage should call chatService.forwardMessage', async () => {
    await controller.forwardMessage({
      sourceMessageId: 'm1',
      targetConversationId: 'c2',
      userId: 'u1',
    });
    expect(chatService.forwardMessage).toHaveBeenCalled();
  });

  it('markReceipt should call chatService.markReceipt', async () => {
    await controller.markReceipt({
      messageId: 'm1',
      userId: 'u1',
      status: 'READ',
    });
    expect(chatService.markReceipt).toHaveBeenCalledWith('m1', 'u1', 'READ');
  });

  it('markAsRead should call chatService.markAsRead', async () => {
    await controller.markAsRead('c1', { userId: 'u1' });
    expect(chatService.markAsRead).toHaveBeenCalledWith('c1', 'u1', undefined);
  });

  it('reactToMessage should call chatService.reactToMessage', async () => {
    await controller.reactToMessage('m1', { userId: 'u1', emoji: '❤️' });
    expect(chatService.reactToMessage).toHaveBeenCalledWith('m1', 'u1', '❤️');
  });

  it('pinMessage should call chatService.pinMessage', async () => {
    await controller.pinMessage('c1', 'm1', { userId: 'u1', pinned: true });
    expect(chatService.pinMessage).toHaveBeenCalledWith('c1', 'm1', 'u1', true);
  });

  it('getUnreadCounts should call chatService.getUnreadCounts', async () => {
    await controller.getUnreadCounts({ userId: 'u1' });
    expect(chatService.getUnreadCounts).toHaveBeenCalledWith('u1');
  });

  it('getGroupMembersForNotif should call chatService.getGroupMembersForNotif', async () => {
    await controller.getGroupMembersForNotif('c1');
    expect(chatService.getGroupMembersForNotif).toHaveBeenCalledWith('c1');
  });
});
