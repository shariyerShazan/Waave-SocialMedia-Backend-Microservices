import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatResolver } from '../e2ee-chat.resolver';
import { E2eeChatGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('E2eeChatResolver', () => {
  let resolver: E2eeChatResolver;
  let e2eeChatClient: jest.Mocked<E2eeChatGrpcClient>;

  beforeEach(async () => {
    const mockE2eeChatGrpcClient = {
      getConversations: jest.fn(),
      getOrCreateDirectConversation: jest.fn(),
      sendEncryptedMessage: jest.fn(),
      getMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eeChatResolver,
        { provide: E2eeChatGrpcClient, useValue: mockE2eeChatGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<E2eeChatResolver>(E2eeChatResolver);
    e2eeChatClient = module.get(E2eeChatGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('e2eeConversations', () => {
    it('should call e2eeChatClient.getConversations', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      e2eeChatClient.getConversations.mockResolvedValue({
        conversations: [],
      } as any);

      const res = await resolver.e2eeConversations(ctx, 1, 20);
      expect(e2eeChatClient.getConversations).toHaveBeenCalledWith({
        userId: 'u1',
        page: 1,
        limit: 20,
      });
      expect(res).toEqual({ conversations: [] });
    });
  });

  describe('createE2eeConversation', () => {
    it('should call e2eeChatClient.getOrCreateDirectConversation', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      e2eeChatClient.getOrCreateDirectConversation.mockResolvedValue({
        conversation: {},
      } as any);

      const res = await resolver.createE2eeConversation(ctx, {
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
  });

  describe('sendEncryptedMessage', () => {
    it('should call e2eeChatClient.sendEncryptedMessage with mapped envelopes', async () => {
      const ctx = { req: { user: { userId: 'u1', deviceId: 'd1' } } };
      e2eeChatClient.sendEncryptedMessage.mockResolvedValue({
        message: {},
      } as any);

      const input = {
        conversationId: 'c1',
        type: 'text',
        envelopes: [
          {
            recipientUserId: 'u2',
            recipientDeviceId: 'd2',
            payload: {
              ciphertext: 'cipher',
              iv: 'iv123',
              authTag: 'tag',
              ratchetHeader: 'hdr',
              ephemeralKey: 'ek',
              oneTimePreKeyId: 'otp1',
              signedPreKeyId: 'spk1',
            },
          },
        ],
      };

      const res = await resolver.sendEncryptedMessage(ctx, input as any);
      expect(e2eeChatClient.sendEncryptedMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        senderDeviceId: 'd1',
        type: 'text',
        envelopes: [
          {
            recipientUserId: 'u2',
            recipientDeviceId: 'd2',
            payload: {
              ciphertext: 'cipher',
              iv: 'iv123',
              authTag: 'tag',
              ratchetHeader: 'hdr',
              ephemeralKey: 'ek',
              oneTimePreKeyId: 'otp1',
              signedPreKeyId: 'spk1',
            },
          },
        ],
        attachments: [],
      });
      expect(res).toEqual({ message: {} });
    });
  });

  describe('e2eeMessages', () => {
    it('should call e2eeChatClient.getMessages', async () => {
      const ctx = { req: { user: { userId: 'u1', deviceId: 'd1' } } };
      e2eeChatClient.getMessages.mockResolvedValue({ messages: [] } as any);

      const res = await resolver.e2eeMessages(ctx, 'c1', undefined, 1, 50);
      expect(e2eeChatClient.getMessages).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u1',
        deviceId: 'd1',
        page: 1,
        limit: 50,
      });
      expect(res).toEqual({ messages: [] });
    });
  });
});
