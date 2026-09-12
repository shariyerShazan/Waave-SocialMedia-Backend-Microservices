import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('ChatController', () => {
  let controller: ChatController;
  let chatClient: jest.Mocked<ChatGrpcClient>;

  beforeEach(async () => {
    const mockChatGrpcClient = {
      getConversations: jest.fn(),
      getConversation: jest.fn(),
      getOrCreateConversation: jest.fn(),
      createGroup: jest.fn(),
      addGroupMember: jest.fn(),
      removeGroupMember: jest.fn(),
      leaveGroup: jest.fn(),
      updateMemberRole: jest.fn(),
      muteConversation: jest.fn(),
      archiveConversation: jest.fn(),
      pinConversation: jest.fn(),
      sendMessage: jest.fn(),
      getMessages: jest.fn(),
      editMessage: jest.fn(),
      deleteMessage: jest.fn(),
      forwardMessage: jest.fn(),
      markReceipt: jest.fn(),
      markAsRead: jest.fn(),
      reactToMessage: jest.fn(),
      pinMessage: jest.fn(),
      getUnreadCounts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatGrpcClient, useValue: mockChatGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    chatClient = module.get(ChatGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations / getConversation / getOrCreateConversation / createGroup', () => {
    it('should call getConversations', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.getConversations.mockResolvedValue({
        conversations: [],
      } as any);

      const res = await controller.getConversations(req, '1', '20', 'true');
      expect(chatClient.getConversations).toHaveBeenCalledWith({
        userId: 'u1',
        page: 1,
        limit: 20,
        archived: true,
      });
      expect(res).toEqual({ conversations: [] });
    });

    it('should call getConversation', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.getConversation.mockResolvedValue({ conversation: {} } as any);

      const res = await controller.getConversation(req, 'c1');
      expect(chatClient.getConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ conversation: {} });
    });

    it('should call getOrCreateConversation', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.getOrCreateConversation.mockResolvedValue({
        conversation: {},
      } as any);

      const res = await controller.getOrCreateConversation(req, {
        targetUserId: 'u2',
      });
      expect(chatClient.getOrCreateConversation).toHaveBeenCalledWith({
        userId1: 'u1',
        userId2: 'u2',
      });
      expect(res).toEqual({ conversation: {} });
    });

    it('should call createGroup', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.createGroup.mockResolvedValue({ conversation: {} } as any);

      const res = await controller.createGroup(req, {
        name: 'Group',
        participantIds: ['u2'],
        avatar: '',
      });
      expect(chatClient.createGroup).toHaveBeenCalledWith({
        name: 'Group',
        creatorId: 'u1',
        participantIds: ['u2'],
        avatar: '',
      });
      expect(res).toEqual({ conversation: {} });
    });
  });

  describe('group members & roles', () => {
    it('should call addGroupMember', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.addGroupMember.mockResolvedValue({ success: true } as any);

      const res = await controller.addGroupMember(req, 'c1', {
        userId: 'u2',
        role: 'MEMBER',
      });
      expect(chatClient.addGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
        role: 'MEMBER',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call removeGroupMember', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.removeGroupMember.mockResolvedValue({ success: true } as any);

      const res = await controller.removeGroupMember(req, 'c1', 'u2');
      expect(chatClient.removeGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call leaveGroup', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.leaveGroup.mockResolvedValue({ success: true } as any);

      const res = await controller.leaveGroup(req, 'c1');
      expect(chatClient.leaveGroup).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call updateMemberRole', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.updateMemberRole.mockResolvedValue({ success: true } as any);

      const res = await controller.updateMemberRole(req, 'c1', 'u2', {
        role: 'ADMIN',
      } as any);
      expect(chatClient.updateMemberRole).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
        role: 'ADMIN',
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('mute / archive / pin conversation', () => {
    it('should call muteConversation', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.muteConversation.mockResolvedValue({ success: true } as any);

      const res = await controller.muteConversation(req, 'c1', {
        muted: true,
        mutedUntil: '2026-01-01',
      });
      expect(chatClient.muteConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        muted: true,
        mutedUntil: '2026-01-01',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call archiveConversation', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.archiveConversation.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.archiveConversation(req, 'c1', {
        archived: true,
      });
      expect(chatClient.archiveConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        archived: true,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call pinConversation', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.pinConversation.mockResolvedValue({ success: true } as any);

      const res = await controller.pinConversation(req, 'c1', {
        pinned: true,
      });
      expect(chatClient.pinConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        pinned: true,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('sendMessage / getMessages / editMessage / deleteMessage / forwardMessage / receipts / unread', () => {
    it('should call sendMessage', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.sendMessage.mockResolvedValue({ message: {} } as any);

      const res = await controller.sendMessage(req, {
        conversationId: 'c1',
        text: 'hi',
      });
      expect(chatClient.sendMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        senderName: '',
        senderAvatar: '',
        text: 'hi',
        mediaIds: undefined,
        type: undefined,
        replyTo: undefined,
        forwardedFromMessageId: undefined,
        clientMessageId: undefined,
      });
      expect(res).toEqual({ message: {} });
    });

    it('should call getMessages', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.getMessages.mockResolvedValue({ messages: [] } as any);

      const res = await controller.getMessages(req, 'c1', {
        page: 1,
        limit: 50,
      });
      expect(chatClient.getMessages).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        page: 1,
        limit: 50,
        beforeMessageId: undefined,
        afterMessageId: undefined,
      });
      expect(res).toEqual({ messages: [] });
    });

    it('should call editMessage', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.editMessage.mockResolvedValue({ message: {} } as any);

      const res = await controller.editMessage(req, 'm1', {
        text: 'edited',
      });
      expect(chatClient.editMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        senderId: 'u1',
        text: 'edited',
      });
      expect(res).toEqual({ message: {} });
    });

    it('should call deleteMessage', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.deleteMessage.mockResolvedValue({ success: true } as any);

      const res = await controller.deleteMessage(req, 'm1', 'true');
      expect(chatClient.deleteMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        forEveryone: true,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call forwardMessage & markReceipt & markAsRead & reactToMessage & pinMessage & getUnreadCounts', async () => {
      const req = { user: { userId: 'u1' } } as any;
      chatClient.forwardMessage.mockResolvedValue({ message: {} } as any);
      chatClient.markReceipt.mockResolvedValue({ success: true } as any);
      chatClient.markAsRead.mockResolvedValue({ success: true } as any);
      chatClient.reactToMessage.mockResolvedValue({ success: true } as any);
      chatClient.pinMessage.mockResolvedValue({ success: true } as any);
      chatClient.getUnreadCounts.mockResolvedValue({ unread: 5 } as any);

      await controller.forwardMessage(req, 'm1', {
        targetConversationId: 'c2',
      } as any);
      expect(chatClient.forwardMessage).toHaveBeenCalledWith({
        sourceMessageId: 'm1',
        targetConversationId: 'c2',
        senderId: 'u1',
      });

      await controller.markReceipt(req, 'm1', { status: 'READ' } as any);
      expect(chatClient.markReceipt).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        status: 'READ',
      });

      await controller.markAsRead(req, 'c1', { upToMessageId: 'm1' });
      expect(chatClient.markAsRead).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        upToMessageId: 'm1',
      });

      await controller.reactToMessage(req, 'm1', { emoji: '👍' });
      expect(chatClient.reactToMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        emoji: '👍',
      });

      await controller.pinMessage(req, 'c1', 'm1', { pinned: true });
      expect(chatClient.pinMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        messageId: 'm1',
        userId: 'u1',
        pinned: true,
      });

      const unreadRes = await controller.getUnreadCounts(req);
      expect(chatClient.getUnreadCounts).toHaveBeenCalledWith({ userId: 'u1' });
      expect(unreadRes).toEqual({ unread: 5 });
    });
  });
});
