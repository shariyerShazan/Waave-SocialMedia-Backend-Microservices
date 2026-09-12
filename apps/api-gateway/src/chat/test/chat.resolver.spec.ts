import { Test, TestingModule } from '@nestjs/testing';
import { ChatResolver } from '../chat.resolver';
import { ChatGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('ChatResolver', () => {
  let resolver: ChatResolver;
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
      providers: [
        ChatResolver,
        { provide: ChatGrpcClient, useValue: mockChatGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<ChatResolver>(ChatResolver);
    chatClient = module.get(ChatGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('conversations / conversation / getOrCreateConversation / createGroup', () => {
    it('should call conversations', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.getConversations.mockResolvedValue({
        conversations: [],
      } as any);

      const res = await resolver.conversations(ctx, 1, 20, false);
      expect(chatClient.getConversations).toHaveBeenCalledWith({
        userId: 'u1',
        page: 1,
        limit: 20,
        archived: false,
      });
      expect(res).toEqual({ conversations: [] });
    });

    it('should call conversation', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.getConversation.mockResolvedValue({ conversation: {} } as any);

      const res = await resolver.conversation(ctx, 'c1');
      expect(chatClient.getConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ conversation: {} });
    });

    it('should call getOrCreateConversation', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.getOrCreateConversation.mockResolvedValue({
        conversation: {},
      } as any);

      const res = await resolver.getOrCreateConversation(ctx, {
        targetUserId: 'u2',
      });
      expect(chatClient.getOrCreateConversation).toHaveBeenCalledWith({
        userId1: 'u1',
        userId2: 'u2',
      });
      expect(res).toEqual({ conversation: {} });
    });

    it('should call createGroup', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.createGroup.mockResolvedValue({ conversation: {} } as any);

      const res = await resolver.createGroup(ctx, {
        name: 'G1',
        participantIds: ['u2'],
      });
      expect(chatClient.createGroup).toHaveBeenCalledWith({
        name: 'G1',
        creatorId: 'u1',
        participantIds: ['u2'],
        avatar: '',
      });
      expect(res).toEqual({ conversation: {} });
    });
  });

  describe('group member management', () => {
    it('should call addGroupMember', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.addGroupMember.mockResolvedValue({ success: true } as any);

      const res = await resolver.addGroupMember(ctx, 'c1', {
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
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.removeGroupMember.mockResolvedValue({ success: true } as any);

      const res = await resolver.removeGroupMember(ctx, 'c1', 'u2');
      expect(chatClient.removeGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call leaveGroup', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.leaveGroup.mockResolvedValue({ success: true } as any);

      const res = await resolver.leaveGroup(ctx, 'c1');
      expect(chatClient.leaveGroup).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call updateMemberRole', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.updateMemberRole.mockResolvedValue({ success: true } as any);

      const res = await resolver.updateMemberRole(ctx, 'c1', 'u2', {
        role: 'ADMIN',
      });
      expect(chatClient.updateMemberRole).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
        role: 'ADMIN',
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe('mute / archive / pin conversation & messages & unread', () => {
    it('should call muteConversation & archiveConversation & pinConversation', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.muteConversation.mockResolvedValue({ success: true } as any);
      chatClient.archiveConversation.mockResolvedValue({
        success: true,
      } as any);
      chatClient.pinConversation.mockResolvedValue({ success: true } as any);

      await resolver.muteConversation(ctx, 'c1', { muted: true });
      expect(chatClient.muteConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        muted: true,
        mutedUntil: undefined,
      });

      await resolver.archiveConversation(ctx, 'c1', { archived: true });
      expect(chatClient.archiveConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        archived: true,
      });

      await resolver.pinConversation(ctx, 'c1', { pinned: true });
      expect(chatClient.pinConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        pinned: true,
      });
    });

    it('should call sendMessage & messages & editMessage & deleteMessage', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.sendMessage.mockResolvedValue({ message: {} } as any);
      chatClient.getMessages.mockResolvedValue({ messages: [] } as any);
      chatClient.editMessage.mockResolvedValue({ message: {} } as any);
      chatClient.deleteMessage.mockResolvedValue({ success: true } as any);

      await resolver.sendMessage(ctx, {
        conversationId: 'c1',
        text: 'hi',
      });
      expect(chatClient.sendMessage).toHaveBeenCalled();

      await resolver.messages(ctx, 'c1', 1, 50);
      expect(chatClient.getMessages).toHaveBeenCalled();

      await resolver.editMessage(ctx, 'm1', { text: 'edit' });
      expect(chatClient.editMessage).toHaveBeenCalled();

      await resolver.deleteMessage(ctx, 'm1', true);
      expect(chatClient.deleteMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        forEveryone: true,
      });
    });

    it('should call forwardMessage & markReceipt & markAsRead & reactToMessage & pinChatMessage & unreadCounts', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      chatClient.forwardMessage.mockResolvedValue({ message: {} } as any);
      chatClient.markReceipt.mockResolvedValue({ success: true } as any);
      chatClient.markAsRead.mockResolvedValue({ success: true } as any);
      chatClient.reactToMessage.mockResolvedValue({ success: true } as any);
      chatClient.pinMessage.mockResolvedValue({ success: true } as any);
      chatClient.getUnreadCounts.mockResolvedValue({ unread: 2 } as any);

      await resolver.forwardMessage(ctx, 'm1', {
        targetConversationId: 'c2',
      });
      expect(chatClient.forwardMessage).toHaveBeenCalled();

      await resolver.markReceipt(ctx, 'm1', { status: 'READ' });
      expect(chatClient.markReceipt).toHaveBeenCalled();

      await resolver.markAsRead(ctx, 'c1', { upToMessageId: 'm1' });
      expect(chatClient.markAsRead).toHaveBeenCalled();

      await resolver.reactToMessage(ctx, 'm1', { emoji: '🎉' });
      expect(chatClient.reactToMessage).toHaveBeenCalled();

      await resolver.pinChatMessage(ctx, 'c1', 'm1', { pinned: true });
      expect(chatClient.pinMessage).toHaveBeenCalled();

      const res = await resolver.unreadCounts(ctx);
      expect(chatClient.getUnreadCounts).toHaveBeenCalledWith({ userId: 'u1' });
      expect(res).toEqual({ unread: 2 });
    });
  });
});
