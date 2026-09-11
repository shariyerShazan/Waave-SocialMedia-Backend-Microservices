import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatGrpcController } from '../e2ee-chat.grpc.controller';
import { E2eeChatService } from '../e2ee-chat.service';

describe('E2eeChatGrpcController', () => {
  let controller: E2eeChatGrpcController;
  let service: any;

  beforeEach(async () => {
    service = {
      getOrCreateDirectConversation: jest
        .fn()
        .mockResolvedValue({ success: true }),
      createGroup: jest.fn().mockResolvedValue({ success: true }),
      getConversations: jest.fn().mockResolvedValue({ success: true }),
      getConversation: jest.fn().mockResolvedValue({ success: true }),
      addGroupMember: jest.fn().mockResolvedValue({ success: true }),
      removeGroupMember: jest.fn().mockResolvedValue({ success: true }),
      leaveGroup: jest.fn().mockResolvedValue({ success: true }),
      updateMemberRole: jest.fn().mockResolvedValue({ success: true }),
      muteConversation: jest.fn().mockResolvedValue({ success: true }),
      archiveConversation: jest.fn().mockResolvedValue({ success: true }),
      pinConversation: jest.fn().mockResolvedValue({ success: true }),
      sendEncryptedMessage: jest.fn().mockResolvedValue({ success: true }),
      getMessages: jest.fn().mockResolvedValue({ success: true }),
      getPendingEnvelopes: jest.fn().mockResolvedValue({ success: true }),
      editEncryptedMessage: jest.fn().mockResolvedValue({ success: true }),
      deleteMessage: jest.fn().mockResolvedValue({ success: true }),
      forwardMessage: jest.fn().mockResolvedValue({ success: true }),
      markReceipt: jest.fn().mockResolvedValue({ success: true }),
      markConversationRead: jest.fn().mockResolvedValue({ success: true }),
      reactToMessage: jest.fn().mockResolvedValue({ success: true }),
      pinMessage: jest.fn().mockResolvedValue({ success: true }),
      uploadSenderKeyDistributions: jest
        .fn()
        .mockResolvedValue({ success: true }),
      getSenderKeyDistributions: jest.fn().mockResolvedValue({ success: true }),
      getUnreadCounts: jest.fn().mockResolvedValue({ success: true }),
      getGroupMembersForNotif: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2eeChatGrpcController],
      providers: [{ provide: E2eeChatService, useValue: service }],
    }).compile();

    controller = module.get<E2eeChatGrpcController>(E2eeChatGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getOrCreateDirectConversation calls service', async () => {
    await controller.getOrCreateDirectConversation({
      userId: 'u1',
      targetUserId: 'u2',
    });
    expect(service.getOrCreateDirectConversation).toHaveBeenCalledWith(
      'u1',
      'u2',
    );
  });

  it('createGroup calls service', async () => {
    await controller.createGroup({
      name: 'G1',
      creatorId: 'u1',
      participantIds: ['u2'],
      avatar: '',
    });
    expect(service.createGroup).toHaveBeenCalled();
  });

  it('getConversations calls service', async () => {
    await controller.getConversations({
      userId: 'u1',
      page: 1,
      limit: 10,
    });
    expect(service.getConversations).toHaveBeenCalledWith(
      'u1',
      1,
      10,
      undefined,
    );
  });

  it('getConversation calls service', async () => {
    await controller.getConversation({ conversationId: 'c1', userId: 'u1' });
    expect(service.getConversation).toHaveBeenCalledWith('c1', 'u1');
  });

  it('addGroupMember calls service', async () => {
    await controller.addGroupMember({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
      role: 'MEMBER',
    });
    expect(service.addGroupMember).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      'MEMBER',
    );
  });

  it('removeGroupMember calls service', async () => {
    await controller.removeGroupMember({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
    });
    expect(service.removeGroupMember).toHaveBeenCalledWith('g1', 'u1', 'u2');
  });

  it('leaveGroup calls service', async () => {
    await controller.leaveGroup({ conversationId: 'g1', userId: 'u1' });
    expect(service.leaveGroup).toHaveBeenCalledWith('g1', 'u1');
  });

  it('updateMemberRole calls service', async () => {
    await controller.updateMemberRole({
      conversationId: 'g1',
      adminId: 'u1',
      userId: 'u2',
      role: 'ADMIN',
    });
    expect(service.updateMemberRole).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      'ADMIN',
    );
  });

  it('muteConversation calls service', async () => {
    await controller.muteConversation({
      conversationId: 'c1',
      userId: 'u1',
      muted: true,
      mutedUntil: '',
    });
    expect(service.muteConversation).toHaveBeenCalledWith('c1', 'u1', true, '');
  });

  it('archiveConversation calls service', async () => {
    await controller.archiveConversation({
      conversationId: 'c1',
      userId: 'u1',
      archived: true,
    });
    expect(service.archiveConversation).toHaveBeenCalledWith('c1', 'u1', true);
  });

  it('pinConversation calls service', async () => {
    await controller.pinConversation({
      conversationId: 'c1',
      userId: 'u1',
      pinned: true,
    });
    expect(service.pinConversation).toHaveBeenCalledWith('c1', 'u1', true);
  });

  it('sendEncryptedMessage calls service', async () => {
    await controller.sendEncryptedMessage({
      conversationId: 'c1',
      senderId: 'u1',
      senderDeviceId: 'd1',
      type: 'text',
      envelopes: [],
    } as any);
    expect(service.sendEncryptedMessage).toHaveBeenCalled();
  });

  it('getMessages calls service', async () => {
    await controller.getMessages({
      conversationId: 'c1',
      userId: 'u1',
      deviceId: 'd1',
      page: 1,
      limit: 10,
    });
    expect(service.getMessages).toHaveBeenCalled();
  });

  it('getPendingEnvelopes calls service', async () => {
    await controller.getPendingEnvelopes({
      userId: 'u1',
      deviceId: 'd1',
      limit: 100,
    });
    expect(service.getPendingEnvelopes).toHaveBeenCalledWith('u1', 'd1', 100);
  });

  it('deleteMessage calls service', async () => {
    await controller.deleteMessage({
      messageId: 'm1',
      userId: 'u1',
      forEveryone: true,
    });
    expect(service.deleteMessage).toHaveBeenCalledWith('m1', 'u1', true);
  });

  it('markReceipt calls service', async () => {
    await controller.markReceipt({
      messageId: 'm1',
      userId: 'u1',
      deviceId: 'd1',
      status: 'READ',
    });
    expect(service.markReceipt).toHaveBeenCalledWith('m1', 'u1', 'd1', 'READ');
  });

  it('markConversationRead calls service', async () => {
    await controller.markConversationRead({
      conversationId: 'c1',
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(service.markConversationRead).toHaveBeenCalledWith(
      'c1',
      'u1',
      'd1',
      undefined,
    );
  });

  it('reactToMessage calls service', async () => {
    await controller.reactToMessage({
      messageId: 'm1',
      userId: 'u1',
      deviceId: 'd1',
      emoji: '👍',
    });
    expect(service.reactToMessage).toHaveBeenCalledWith('m1', 'u1', 'd1', '👍');
  });

  it('pinMessage calls service', async () => {
    await controller.pinMessage({
      conversationId: 'c1',
      messageId: 'm1',
      userId: 'u1',
      pinned: true,
    });
    expect(service.pinMessage).toHaveBeenCalledWith('c1', 'm1', 'u1', true);
  });

  it('uploadSenderKeyDistributions calls service', async () => {
    await controller.uploadSenderKeyDistributions({
      conversationId: 'c1',
      senderId: 'u1',
      senderDeviceId: 'd1',
      distributions: [],
    });
    expect(service.uploadSenderKeyDistributions).toHaveBeenCalled();
  });

  it('getSenderKeyDistributions calls service', async () => {
    await controller.getSenderKeyDistributions({
      conversationId: 'c1',
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(service.getSenderKeyDistributions).toHaveBeenCalledWith(
      'c1',
      'u1',
      'd1',
    );
  });

  it('getUnreadCounts calls service', async () => {
    await controller.getUnreadCounts({ userId: 'u1' });
    expect(service.getUnreadCounts).toHaveBeenCalledWith('u1');
  });

  it('getGroupMembersForNotif calls service', async () => {
    await controller.getGroupMembersForNotif({ conversationId: 'c1' });
    expect(service.getGroupMembersForNotif).toHaveBeenCalledWith('c1');
  });
});
