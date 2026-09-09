import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat.gateway';
import { ChatService } from '../../chat.service';
import { ChatRedisService } from '../../../redis/redis.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: any;
  let redisService: any;
  let mockServer: any;
  let mockSocket: any;
  let redisMessageHandler: any;

  beforeEach(async () => {
    chatService = {
      getConversations: jest.fn().mockResolvedValue({
        conversations: [{ id: 'c1' }],
      }),
      sendMessage: jest.fn().mockResolvedValue({
        _id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        senderName: 'User 1',
        senderAvatar: '',
        text: 'hello',
        mediaIds: [],
        type: 'text',
        readBy: ['u1'],
        reactions: {},
        createdAt: new Date(),
      }),
      getOrCreateConversation: jest.fn().mockResolvedValue({
        _id: 'c1',
      }),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      reactToMessage: jest.fn().mockResolvedValue({
        reactions: { '👍': ['u1'] },
      }),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    };

    redisService = {
      onMessage: jest.fn().mockImplementation((handler) => {
        redisMessageHandler = handler;
      }),
      setUserOnline: jest.fn().mockResolvedValue(undefined),
      setUserOffline: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      clearTyping: jest.fn().mockResolvedValue(undefined),
      setTyping: jest.fn().mockResolvedValue(undefined),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'socket_123',
      userId: 'u1',
      userName: 'User 1',
      avatar: '',
      handshake: {
        auth: { userId: 'u1', userName: 'User 1', avatar: '' },
        query: {},
      },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      emit: jest.fn(),
      broadcast: {
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: chatService },
        { provide: ChatRedisService, useValue: redisService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('afterInit should set up redis message listener', () => {
    gateway.afterInit();
    expect(redisService.onMessage).toHaveBeenCalled();
  });

  describe('handleConnection', () => {
    it('should disconnect if userId is missing', async () => {
      const unauthSocket: any = {
        id: 's2',
        handshake: { auth: {}, query: {} },
        disconnect: jest.fn(),
      };
      await gateway.handleConnection(unauthSocket);
      expect(unauthSocket.disconnect).toHaveBeenCalled();
    });

    it('should set online status and join rooms for authorized user', async () => {
      await gateway.handleConnection(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(redisService.setUserOnline).toHaveBeenCalledWith(
        'u1',
        'socket_123',
      );
      expect(chatService.getConversations).toHaveBeenCalledWith('u1', 1, 100);
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:c1');
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('user:online', {
        userId: 'u1',
        userName: 'User 1',
        avatar: '',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should set user offline and broadcast disconnection', async () => {
      await gateway.handleDisconnect(mockSocket);
      expect(redisService.setUserOffline).toHaveBeenCalledWith('u1');
      expect(mockServer.emit).toHaveBeenCalledWith('user:offline', {
        userId: 'u1',
        lastSeen: expect.any(Number),
      });
    });

    it('should do nothing if socket has no userId', async () => {
      const socketWithoutUser: any = { id: 's3' };
      await gateway.handleDisconnect(socketWithoutUser);
      expect(redisService.setUserOffline).not.toHaveBeenCalled();
    });
  });

  describe('Subscribed Socket Messages', () => {
    it('handleSendMessage should send message and publish to redis', async () => {
      await gateway.handleSendMessage(mockSocket, {
        conversationId: 'c1',
        text: 'hello',
      });

      expect(chatService.sendMessage).toHaveBeenCalled();
      expect(redisService.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.objectContaining({ type: 'new_message' }),
      );
      expect(redisService.clearTyping).toHaveBeenCalledWith('c1', 'u1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message:sent',
        expect.any(Object),
      );
    });

    it('handleSendMessage should emit error on failure', async () => {
      chatService.sendMessage.mockRejectedValue(new Error('Send failed'));
      await gateway.handleSendMessage(mockSocket, {
        conversationId: 'c1',
        text: 'hello',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('message:error', {
        error: 'Send failed',
      });
    });

    it('handleStartConversation should get/create conversation and join room', async () => {
      await gateway.handleStartConversation(mockSocket, { targetUserId: 'u2' });
      expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
        'u1',
        'u2',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:c1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:started',
        expect.any(Object),
      );
    });

    it('handleJoinConversation should join room and mark as read', async () => {
      await gateway.handleJoinConversation(mockSocket, {
        conversationId: 'c1',
      });
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:c1');
      expect(chatService.markAsRead).toHaveBeenCalledWith('c1', 'u1');
      expect(redisService.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.objectContaining({ type: 'messages_read' }),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:joined', {
        conversationId: 'c1',
      });
    });

    it('handleTypingStart and handleTypingStop should update redis', async () => {
      await gateway.handleTypingStart(mockSocket, { conversationId: 'c1' });
      expect(redisService.setTyping).toHaveBeenCalledWith('c1', 'u1', 'User 1');

      await gateway.handleTypingStop(mockSocket, { conversationId: 'c1' });
      expect(redisService.clearTyping).toHaveBeenCalledWith('c1', 'u1');
    });

    it('handleReaction should update reaction and publish event', async () => {
      await gateway.handleReaction(mockSocket, {
        messageId: 'm1',
        conversationId: 'c1',
        emoji: '👍',
      });

      expect(chatService.reactToMessage).toHaveBeenCalledWith('m1', 'u1', '👍');
      expect(redisService.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.objectContaining({ type: 'message_reaction' }),
      );
    });

    it('handleDeleteMessage should delete message and publish event', async () => {
      await gateway.handleDeleteMessage(mockSocket, {
        messageId: 'm1',
        conversationId: 'c1',
      });

      expect(chatService.deleteMessage).toHaveBeenCalledWith('m1', 'u1');
      expect(redisService.publish).toHaveBeenCalledWith(
        'chat:conversation:c1',
        expect.objectContaining({ type: 'message_deleted' }),
      );
    });
  });

  describe('Redis Message Bridge', () => {
    beforeEach(() => {
      gateway.afterInit();
    });

    it('should handle redis conversation new_message event', () => {
      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: { type: 'new_message', message: { id: 'm1' } },
      });
      expect(mockServer.to).toHaveBeenCalledWith('conversation:c1');
      expect(mockServer.emit).toHaveBeenCalledWith('message:new', { id: 'm1' });
    });

    it('should handle redis conversation typing_start and typing_stop events', () => {
      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: { type: 'typing_start', userId: 'u2', userName: 'User 2' },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('typing:start', {
        userId: 'u2',
        userName: 'User 2',
      });

      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: { type: 'typing_stop', userId: 'u2' },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('typing:stop', {
        userId: 'u2',
      });
    });

    it('should handle redis conversation messages_read, message_reaction, message_deleted events', () => {
      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: { type: 'messages_read', userId: 'u2', timestamp: 12345 },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('messages:read', {
        userId: 'u2',
        timestamp: 12345,
      });

      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: {
          type: 'message_reaction',
          messageId: 'm1',
          emoji: '👍',
          userId: 'u2',
          reactions: {},
        },
      });
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message:reaction',
        expect.any(Object),
      );

      redisMessageHandler({
        channel: 'chat:conversation:c1',
        data: { type: 'message_deleted', messageId: 'm1' },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('message:deleted', {
        messageId: 'm1',
      });
    });

    it('should handle redis presence online and offline events', () => {
      redisMessageHandler({
        channel: 'chat:presence',
        data: { type: 'online', userId: 'u2', socketId: 's2' },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('user:online', {
        userId: 'u2',
        socketId: 's2',
      });

      redisMessageHandler({
        channel: 'chat:presence',
        data: { type: 'offline', userId: 'u2', lastSeen: 12345 },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('user:offline', {
        userId: 'u2',
        lastSeen: 12345,
      });
    });
  });
});
