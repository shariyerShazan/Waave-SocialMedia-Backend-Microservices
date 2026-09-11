import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatHttpController } from '../e2ee-chat.http.controller';
import { E2eeChatService } from '../e2ee-chat.service';
import {
  AuthGuard,
  E2eeMemberRole,
  E2eeMessageType,
  E2eeReceiptStatus,
} from '@app/common';

describe('E2eeChatHttpController', () => {
  let controller: E2eeChatHttpController;
  let service: any;
  let mockReq: any;

  beforeEach(async () => {
    mockReq = {
      user: { userId: 'u1', deviceId: 'd1' },
    };

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
      controllers: [E2eeChatHttpController],
      providers: [{ provide: E2eeChatService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<E2eeChatHttpController>(E2eeChatHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getOrCreateDirect calls service', async () => {
    await controller.getOrCreateDirect(mockReq, { targetUserId: 'u2' });
    expect(service.getOrCreateDirectConversation).toHaveBeenCalledWith(
      'u1',
      'u2',
    );
  });

  it('createGroup calls service', async () => {
    await controller.createGroup(mockReq, {
      name: 'G1',
      participantIds: ['u2'],
    });
    expect(service.createGroup).toHaveBeenCalled();
  });

  it('getConversations calls service', async () => {
    await controller.getConversations(mockReq, 1, 20, 'true');
    expect(service.getConversations).toHaveBeenCalledWith('u1', 1, 20, true);
  });

  it('getConversation calls service', async () => {
    await controller.getConversation(mockReq, 'c1');
    expect(service.getConversation).toHaveBeenCalledWith('c1', 'u1');
  });

  it('addGroupMember calls service', async () => {
    await controller.addGroupMember(mockReq, 'g1', {
      userId: 'u2',
      role: E2eeMemberRole.MEMBER,
    });
    expect(service.addGroupMember).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      E2eeMemberRole.MEMBER,
    );
  });

  it('removeGroupMember calls service', async () => {
    await controller.removeGroupMember(mockReq, 'g1', 'u2');
    expect(service.removeGroupMember).toHaveBeenCalledWith('g1', 'u1', 'u2');
  });

  it('leaveGroup calls service', async () => {
    await controller.leaveGroup(mockReq, 'g1');
    expect(service.leaveGroup).toHaveBeenCalledWith('g1', 'u1');
  });

  it('updateMemberRole calls service', async () => {
    await controller.updateMemberRole(mockReq, 'g1', 'u2', {
      userId: 'u2',
      role: E2eeMemberRole.ADMIN,
    });
    expect(service.updateMemberRole).toHaveBeenCalledWith(
      'g1',
      'u1',
      'u2',
      E2eeMemberRole.ADMIN,
    );
  });

  it('muteConversation calls service', async () => {
    await controller.muteConversation(mockReq, 'c1', { muted: true });
    expect(service.muteConversation).toHaveBeenCalledWith(
      'c1',
      'u1',
      true,
      undefined,
    );
  });

  it('archiveConversation calls service', async () => {
    await controller.archiveConversation(mockReq, 'c1', { archived: true });
    expect(service.archiveConversation).toHaveBeenCalledWith('c1', 'u1', true);
  });

  it('pinConversation calls service', async () => {
    await controller.pinConversation(mockReq, 'c1', { pinned: true });
    expect(service.pinConversation).toHaveBeenCalledWith('c1', 'u1', true);
  });

  it('sendMessage calls service', async () => {
    await controller.sendMessage(mockReq, {
      conversationId: 'c1',
      senderDeviceId: 'd1',
      type: E2eeMessageType.TEXT,
      envelopes: [],
    });
    expect(service.sendEncryptedMessage).toHaveBeenCalled();
  });

  it('getMessages calls service', async () => {
    await controller.getMessages(mockReq, 'c1', 'd1', { page: 1, limit: 10 });
    expect(service.getMessages).toHaveBeenCalled();
  });

  it('getPendingEnvelopes calls service', async () => {
    await controller.getPendingEnvelopes(mockReq, 'd1', 100);
    expect(service.getPendingEnvelopes).toHaveBeenCalledWith('u1', 'd1', 100);
  });

  it('deleteMessage calls service', async () => {
    await controller.deleteMessage(mockReq, 'm1', 'true');
    expect(service.deleteMessage).toHaveBeenCalledWith('m1', 'u1', true);
  });

  it('markReceipt calls service', async () => {
    await controller.markReceipt(mockReq, {
      messageId: 'm1',
      deviceId: 'd1',
      status: E2eeReceiptStatus.READ,
    });
    expect(service.markReceipt).toHaveBeenCalledWith(
      'm1',
      'u1',
      'd1',
      E2eeReceiptStatus.READ,
    );
  });

  it('markConversationRead calls service', async () => {
    await controller.markConversationRead(mockReq, 'c1', { deviceId: 'd1' });
    expect(service.markConversationRead).toHaveBeenCalledWith(
      'c1',
      'u1',
      'd1',
      undefined,
    );
  });

  it('reactToMessage calls service', async () => {
    await controller.reactToMessage(mockReq, 'm1', {
      deviceId: 'd1',
      emoji: '❤️',
    });
    expect(service.reactToMessage).toHaveBeenCalledWith('m1', 'u1', 'd1', '❤️');
  });

  it('pinMessage calls service', async () => {
    await controller.pinMessage(mockReq, 'c1', 'm1', { pinned: true });
    expect(service.pinMessage).toHaveBeenCalledWith('c1', 'm1', 'u1', true);
  });

  it('uploadSenderKeys calls service', async () => {
    await controller.uploadSenderKeys(mockReq, {
      conversationId: 'c1',
      senderDeviceId: 'd1',
      distributions: [],
    });
    expect(service.uploadSenderKeyDistributions).toHaveBeenCalled();
  });

  it('getSenderKeys calls service', async () => {
    await controller.getSenderKeys(mockReq, 'c1', 'd1');
    expect(service.getSenderKeyDistributions).toHaveBeenCalledWith(
      'c1',
      'u1',
      'd1',
    );
  });

  it('getUnreadCounts calls service', async () => {
    await controller.getUnreadCounts(mockReq);
    expect(service.getUnreadCounts).toHaveBeenCalledWith('u1');
  });

  it('getGroupMembersForNotif calls service', async () => {
    await controller.getGroupMembersForNotif('c1');
    expect(service.getGroupMembersForNotif).toHaveBeenCalledWith('c1');
  });
});
