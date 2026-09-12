import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatController } from '../e2ee-chat.controller';
import { E2eeChatGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('E2eeChatController', () => {
  let controller: E2eeChatController;
  let e2eeChatClient: jest.Mocked<E2eeChatGrpcClient>;

  beforeEach(async () => {
    const mockE2eeChatGrpcClient = {
      getConversations: jest.fn(),
      getConversation: jest.fn(),
      getOrCreateDirectConversation: jest.fn(),
      createGroup: jest.fn(),
      addGroupMember: jest.fn(),
      removeGroupMember: jest.fn(),
      leaveGroup: jest.fn(),
      updateMemberRole: jest.fn(),
      muteConversation: jest.fn(),
      archiveConversation: jest.fn(),
      pinConversation: jest.fn(),
      sendEncryptedMessage: jest.fn(),
      getMessages: jest.fn(),
      getPendingEnvelopes: jest.fn(),
      editEncryptedMessage: jest.fn(),
      deleteMessage: jest.fn(),
      forwardMessage: jest.fn(),
      markReceipt: jest.fn(),
      markConversationRead: jest.fn(),
      reactToMessage: jest.fn(),
      pinMessage: jest.fn(),
      uploadSenderKeyDistributions: jest.fn(),
      getSenderKeyDistributions: jest.fn(),
      getUnreadCounts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2eeChatController],
      providers: [
        { provide: E2eeChatGrpcClient, useValue: mockE2eeChatGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<E2eeChatController>(E2eeChatController);
    e2eeChatClient = module.get(E2eeChatGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConversations / getConversation / getOrCreateDirect / createGroup', () => {
    it('should call getConversations', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.getConversations.mockResolvedValue({
        conversations: [],
      } as any);

      const res = await controller.getConversations(req, '1', '20', 'true');
      expect(e2eeChatClient.getConversations).toHaveBeenCalledWith({
        userId: 'u1',
        page: 1,
        limit: 20,
        archived: true,
      });
      expect(res).toEqual({ conversations: [] });
    });

    it('should call getConversation', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.getConversation.mockResolvedValue({
        conversation: {},
      } as any);

      const res = await controller.getConversation(req, 'c1');
      expect(e2eeChatClient.getConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ conversation: {} });
    });

    it('should call getOrCreateDirect', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.getOrCreateDirectConversation.mockResolvedValue({
        conversation: {},
      } as any);

      const res = await controller.getOrCreateDirect(req, {
        targetUserId: 'u2',
      });
      expect(e2eeChatClient.getOrCreateDirectConversation).toHaveBeenCalledWith(
        {
          userId: 'u1',
          targetUserId: 'u2',
        },
      );
      expect(res).toEqual({ conversation: {} });
    });

    it('should call createGroup', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.createGroup.mockResolvedValue({ conversation: {} } as any);

      const res = await controller.createGroup(req, {
        name: 'E2EE Group',
        participantIds: ['u2'],
      });
      expect(e2eeChatClient.createGroup).toHaveBeenCalledWith({
        name: 'E2EE Group',
        creatorId: 'u1',
        participantIds: ['u2'],
        avatar: '',
      });
      expect(res).toEqual({ conversation: {} });
    });
  });

  describe('group members & roles & mute/archive/pin', () => {
    it('should call addGroupMember', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.addGroupMember.mockResolvedValue({ success: true } as any);

      const res = await controller.addGroupMember(req, 'c1', {
        userId: 'u2',
        role: 'MEMBER',
      } as any);
      expect(e2eeChatClient.addGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
        role: 'MEMBER',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call removeGroupMember', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.removeGroupMember.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.removeGroupMember(req, 'c1', 'u2');
      expect(e2eeChatClient.removeGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call leaveGroup', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.leaveGroup.mockResolvedValue({ success: true } as any);

      const res = await controller.leaveGroup(req, 'c1');
      expect(e2eeChatClient.leaveGroup).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call updateMemberRole', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.updateMemberRole.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.updateMemberRole(req, 'c1', 'u2', {
        role: 'ADMIN',
      } as any);
      expect(e2eeChatClient.updateMemberRole).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u2',
        role: 'ADMIN',
      });
      expect(res).toEqual({ success: true });
    });

    it('should call muteConversation & archiveConversation & pinConversation', async () => {
      const req = { user: { userId: 'u1' }, headers: {} } as any;
      e2eeChatClient.muteConversation.mockResolvedValue({
        success: true,
      } as any);
      e2eeChatClient.archiveConversation.mockResolvedValue({
        success: true,
      } as any);
      e2eeChatClient.pinConversation.mockResolvedValue({
        success: true,
      } as any);

      await controller.muteConversation(req, 'c1', { muted: true });
      expect(e2eeChatClient.muteConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        muted: true,
        mutedUntil: undefined,
      });

      await controller.archiveConversation(req, 'c1', {
        archived: true,
      });
      expect(e2eeChatClient.archiveConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        archived: true,
      });

      await controller.pinConversation(req, 'c1', { pinned: true });
      expect(e2eeChatClient.pinConversation).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        pinned: true,
      });
    });
  });

  describe('messages / envelopes / sender keys / receipts / unread', () => {
    it('should call sendMessage resolving deviceId', async () => {
      const req = {
        user: { userId: 'u1', deviceId: 'dev-1' },
        headers: {},
      } as any;
      e2eeChatClient.sendEncryptedMessage.mockResolvedValue({
        message: {},
      } as any);

      const res = await controller.sendMessage(req, {
        conversationId: 'c1',
        type: 'text',
        envelopes: [],
      } as any);

      expect(e2eeChatClient.sendEncryptedMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        senderDeviceId: 'dev-1',
        type: 'text',
        envelopes: [],
        attachments: [],
        replyToMessageId: undefined,
        forwardedFromMessageId: undefined,
        clientMessageId: undefined,
      });
      expect(res).toEqual({ message: {} });
    });

    it('should call getMessages & getPendingEnvelopes', async () => {
      const req = {
        user: { userId: 'u1', deviceId: 'd1' },
        headers: {},
      } as any;
      e2eeChatClient.getMessages.mockResolvedValue({ messages: [] } as any);
      e2eeChatClient.getPendingEnvelopes.mockResolvedValue({
        envelopes: [],
      } as any);

      await controller.getMessages(req, 'c1', { page: 1, limit: 50 });
      expect(e2eeChatClient.getMessages).toHaveBeenCalled();

      await controller.getPendingEnvelopes(req, undefined, '100');
      expect(e2eeChatClient.getPendingEnvelopes).toHaveBeenCalledWith({
        userId: 'u1',
        deviceId: 'd1',
        limit: 100,
      });
    });

    it('should call editMessage & deleteMessage & forwardMessage', async () => {
      const req = {
        user: { userId: 'u1', deviceId: 'd1' },
        headers: {},
      } as any;
      e2eeChatClient.editEncryptedMessage.mockResolvedValue({
        message: {},
      } as any);
      e2eeChatClient.deleteMessage.mockResolvedValue({ success: true } as any);
      e2eeChatClient.forwardMessage.mockResolvedValue({ message: {} } as any);

      await controller.editMessage(req, 'm1', { envelopes: [] });
      expect(e2eeChatClient.editEncryptedMessage).toHaveBeenCalled();

      await controller.deleteMessage(req, 'm1', 'true');
      expect(e2eeChatClient.deleteMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        forEveryone: true,
      });

      await controller.forwardMessage(req, 'm1', {
        targetConversationId: 'c2',
        envelopes: [],
      } as any);
      expect(e2eeChatClient.forwardMessage).toHaveBeenCalled();
    });

    it('should call markReceipt & markConversationRead & reactToMessage & pinMessage', async () => {
      const req = {
        user: { userId: 'u1', deviceId: 'd1' },
        headers: {},
      } as any;
      e2eeChatClient.markReceipt.mockResolvedValue({ success: true } as any);
      e2eeChatClient.markConversationRead.mockResolvedValue({
        success: true,
      } as any);
      e2eeChatClient.reactToMessage.mockResolvedValue({ success: true } as any);
      e2eeChatClient.pinMessage.mockResolvedValue({ success: true } as any);

      await controller.markReceipt(req, 'm1', { status: 'READ' } as any);
      expect(e2eeChatClient.markReceipt).toHaveBeenCalled();

      await controller.markConversationRead(req, 'c1', {
        upToMessageId: 'm1',
      } as any);
      expect(e2eeChatClient.markConversationRead).toHaveBeenCalled();

      await controller.reactToMessage(req, 'm1', { emoji: '❤️' } as any);
      expect(e2eeChatClient.reactToMessage).toHaveBeenCalled();

      await controller.pinMessage(req, 'c1', 'm1', { pinned: true });
      expect(e2eeChatClient.pinMessage).toHaveBeenCalled();
    });

    it('should call uploadSenderKeys & getSenderKeys & getUnreadCounts', async () => {
      const req = {
        user: { userId: 'u1', deviceId: 'd1' },
        headers: {},
      } as any;
      e2eeChatClient.uploadSenderKeyDistributions.mockResolvedValue({
        success: true,
      } as any);
      e2eeChatClient.getSenderKeyDistributions.mockResolvedValue({
        distributions: [],
      } as any);
      e2eeChatClient.getUnreadCounts.mockResolvedValue({ unread: 3 } as any);

      await controller.uploadSenderKeys(req, {
        conversationId: 'c1',
        distributions: [],
      } as any);
      expect(e2eeChatClient.uploadSenderKeyDistributions).toHaveBeenCalled();

      await controller.getSenderKeys(req, 'c1');
      expect(e2eeChatClient.getSenderKeyDistributions).toHaveBeenCalled();

      const unreadRes = await controller.getUnreadCounts(req);
      expect(e2eeChatClient.getUnreadCounts).toHaveBeenCalledWith({
        userId: 'u1',
      });
      expect(unreadRes).toEqual({ unread: 3 });
    });
  });
});
