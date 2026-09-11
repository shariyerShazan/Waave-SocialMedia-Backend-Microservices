import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatGateway } from '../e2ee-chat.gateway';
import { E2eeChatService } from '../../e2ee-chat.service';
import { E2eeChatRedisService } from '../../../redis/redis.service';
import { WsAuthGuard } from '@app/common';

describe('E2eeChatGateway', () => {
  let gateway: E2eeChatGateway;
  let service: any;
  let redis: any;
  let wsAuthGuard: any;
  let mockServer: any;
  let mockSocket: any;
  let redisMessageHandler: any;

  beforeEach(async () => {
    service = {
      getConversations: jest.fn().mockResolvedValue({
        conversations: [{ id: 'c1' }],
      }),
      getOrCreateDirectConversation: jest.fn().mockResolvedValue({
        conversation: { id: 'c1' },
      }),
      markConversationRead: jest.fn().mockResolvedValue(undefined),
      sendEncryptedMessage: jest.fn().mockResolvedValue({
        encryptedMessage: { id: 'm1' },
      }),
      markReceipt: jest.fn().mockResolvedValue({ success: true }),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      editEncryptedMessage: jest.fn().mockResolvedValue({
        encryptedMessage: { id: 'm1' },
      }),
      reactToMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    redis = {
      onMessage: jest.fn().mockImplementation((handler) => {
        redisMessageHandler = handler;
      }),
      setDeviceOnline: jest.fn().mockResolvedValue(undefined),
      setDeviceOffline: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue(true),
      clearTyping: jest.fn().mockResolvedValue(undefined),
      setTyping: jest.fn().mockResolvedValue(undefined),
    };

    wsAuthGuard = {
      authenticate: jest.fn().mockResolvedValue(true),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'socket_123',
      userId: 'u1',
      deviceId: 'd1',
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eeChatGateway,
        { provide: E2eeChatService, useValue: service },
        { provide: E2eeChatRedisService, useValue: redis },
        { provide: WsAuthGuard, useValue: wsAuthGuard },
      ],
    }).compile();

    gateway = module.get<E2eeChatGateway>(E2eeChatGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('afterInit should set up redis message listener', () => {
    gateway.afterInit();
    expect(redis.onMessage).toHaveBeenCalled();
  });

  describe('handleConnection', () => {
    it('should disconnect client if authentication fails', async () => {
      wsAuthGuard.authenticate.mockRejectedValue(new Error('Unauthorized'));
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should set device online and join rooms on connection', async () => {
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(mockSocket.join).toHaveBeenCalledWith('device:u1:d1');
      expect(redis.setDeviceOnline).toHaveBeenCalledWith(
        'u1',
        'd1',
        'socket_123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connection:ready',
        expect.any(Object),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should set device offline', async () => {
      await gateway.handleDisconnect(mockSocket);
      expect(redis.setDeviceOffline).toHaveBeenCalledWith('u1', 'd1');
    });
  });

  describe('Socket Subscribed Messages', () => {
    it('handleHeartbeat updates online status and sends ack', async () => {
      await gateway.handleHeartbeat(mockSocket);
      expect(redis.setDeviceOnline).toHaveBeenCalledWith(
        'u1',
        'd1',
        'socket_123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'heartbeat:ack',
        expect.any(Object),
      );
    });

    it('handleStartConversation gets or creates direct conv and joins room', async () => {
      await gateway.handleStartConversation(mockSocket, { targetUserId: 'u2' });
      expect(service.getOrCreateDirectConversation).toHaveBeenCalledWith(
        'u1',
        'u2',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:c1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:started',
        expect.any(Object),
      );
    });

    it('handleJoinConversation joins room and marks read', async () => {
      await gateway.handleJoinConversation(mockSocket, {
        conversationId: 'c1',
      });
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:c1');
      expect(service.markConversationRead).toHaveBeenCalledWith(
        'c1',
        'u1',
        'd1',
      );
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
    });

    it('handleSendMessage sends message and publishes to redis', async () => {
      await gateway.handleSendMessage(mockSocket, {
        conversationId: 'c1',
        envelopes: [
          {
            recipientUserId: 'u2',
            recipientDeviceId: 'd2',
            payload: { ciphertext: 'c', iv: 'i', authTag: 't' },
          },
        ],
      });

      expect(service.sendEncryptedMessage).toHaveBeenCalled();
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message:sent',
        expect.any(Object),
      );
    });

    it('handleSendMessage emits error if rate limit exceeded', async () => {
      redis.checkRateLimit.mockResolvedValue(false);
      await gateway.handleSendMessage(mockSocket, {
        conversationId: 'c1',
        envelopes: [],
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('message:error', {
        error: 'Rate limit exceeded',
      });
    });

    it('handleReceipt marks receipt and publishes update', async () => {
      await gateway.handleReceipt(mockSocket, {
        messageId: 'm1',
        status: 'READ',
        conversationId: 'c1',
      });
      expect(service.markReceipt).toHaveBeenCalledWith(
        'm1',
        'u1',
        'd1',
        'READ',
      );
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
    });

    it('handleTypingStart and handleTypingStop update redis typing status', async () => {
      await gateway.handleTypingStart(mockSocket, { conversationId: 'c1' });
      expect(redis.setTyping).toHaveBeenCalledWith('c1', 'u1', 'd1');

      await gateway.handleTypingStop(mockSocket, { conversationId: 'c1' });
      expect(redis.clearTyping).toHaveBeenCalledWith('c1', 'u1', 'd1');
    });

    it('handleDeleteMessage calls service and publishes to redis', async () => {
      await gateway.handleDeleteMessage(mockSocket, {
        messageId: 'm1',
        conversationId: 'c1',
        forEveryone: true,
      });
      expect(service.deleteMessage).toHaveBeenCalledWith('m1', 'u1', true);
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
    });

    it('handleEditMessage calls service and publishes updates', async () => {
      await gateway.handleEditMessage(mockSocket, {
        messageId: 'm1',
        conversationId: 'c1',
        envelopes: [],
      });
      expect(service.editEncryptedMessage).toHaveBeenCalled();
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
    });

    it('handleReaction calls service and publishes reaction', async () => {
      await gateway.handleReaction(mockSocket, {
        messageId: 'm1',
        conversationId: 'c1',
        emoji: '👍',
      });
      expect(service.reactToMessage).toHaveBeenCalledWith(
        'm1',
        'u1',
        'd1',
        '👍',
      );
      expect(redis.publish).toHaveBeenCalledWith(
        'e2ee:conversation:c1',
        expect.any(Object),
      );
    });
  });

  describe('Redis Pub/Sub Message Bridge', () => {
    beforeEach(() => {
      gateway.afterInit();
    });

    it('should forward e2ee:conversation events to socket rooms', () => {
      redisMessageHandler({
        channel: 'e2ee:conversation:c1',
        data: { type: 'new_message', message: { id: 'm1' } },
      });
      expect(mockServer.to).toHaveBeenCalledWith('conversation:c1');
      expect(mockServer.emit).toHaveBeenCalledWith('message:new', { id: 'm1' });
    });

    it('should forward e2ee:device events to device room', () => {
      redisMessageHandler({
        channel: 'e2ee:device:u1:d1',
        data: { type: 'new_envelope', envelope: { id: 'e1' } },
      });
      expect(mockServer.to).toHaveBeenCalledWith('device:u1:d1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'envelope:new',
        expect.any(Object),
      );
    });

    it('should forward e2ee:presence events globally', () => {
      redisMessageHandler({
        channel: 'e2ee:presence',
        data: { type: 'device_online', userId: 'u1', deviceId: 'd1' },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('presence:online', {
        userId: 'u1',
        deviceId: 'd1',
      });
    });
  });
});
