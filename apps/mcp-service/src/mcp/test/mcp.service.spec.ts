import { Test, TestingModule } from '@nestjs/testing';
import { McpServerService } from '../mcp.service';
import {
  UserGrpcClient,
  PostGrpcClient,
  FeedGrpcClient,
  ChatGrpcClient,
} from 'libs/grpc-clients/src';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/sse.js');

describe('McpServerService', () => {
  let service: McpServerService;
  let mockUserClient: any;
  let mockPostClient: any;
  let mockFeedClient: any;
  let mockChatClient: any;
  let mockServer: any;
  let mockTransport: any;

  beforeEach(async () => {
    mockUserClient = {};
    mockPostClient = {};
    mockFeedClient = {};
    mockChatClient = {};

    mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      tool: jest.fn(),
    };

    mockTransport = {
      sessionId: 'test-session-id',
      handlePostMessage: jest.fn().mockResolvedValue(undefined),
    };

    (McpServer as unknown as jest.Mock).mockImplementation(() => mockServer);
    (SSEServerTransport as unknown as jest.Mock).mockImplementation(
      () => mockTransport,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServerService,
        { provide: UserGrpcClient, useValue: mockUserClient },
        { provide: PostGrpcClient, useValue: mockPostClient },
        { provide: FeedGrpcClient, useValue: mockFeedClient },
        { provide: ChatGrpcClient, useValue: mockChatClient },
      ],
    }).compile();

    service = module.get<McpServerService>(McpServerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSseConnect', () => {
    it('should initialize McpServer and SSEServerTransport, connect, and register session', async () => {
      let closeHandler: (() => void) | undefined;
      const mockReq: any = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'close') closeHandler = cb;
        }),
      };
      const mockRes: any = {};

      await service.handleSseConnect(mockReq, mockRes);

      expect(SSEServerTransport).toHaveBeenCalledWith('/mcp/messages', mockRes);
      expect(McpServer).toHaveBeenCalledWith({
        name: 'Waave-MCP-Server',
        version: '1.0.0',
      });
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);

      // Trigger close event
      expect(closeHandler).toBeDefined();
      if (closeHandler) closeHandler();
    });
  });

  describe('handlePostMessage', () => {
    it('should return 400 status if sessionId is missing in query or headers', async () => {
      const mockReq: any = { query: {}, headers: {} };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await service.handlePostMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing mcp-session-id header or query param',
      });
    });

    it('should return 404 status if session is not found in session map', async () => {
      const mockReq: any = {
        query: { sessionId: 'non-existent' },
        headers: {},
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await service.handlePostMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Session non-existent not found or expired',
      });
    });

    it('should delegate to transport.handlePostMessage if session exists', async () => {
      const mockReqConnect: any = { on: jest.fn() };
      const mockResConnect: any = {};
      await service.handleSseConnect(mockReqConnect, mockResConnect);

      const mockReqPost: any = {
        query: { sessionId: 'test-session-id' },
        headers: {},
      };
      const mockResPost: any = {};

      await service.handlePostMessage(mockReqPost, mockResPost);

      expect(mockTransport.handlePostMessage).toHaveBeenCalledWith(
        mockReqPost,
        mockResPost,
      );
    });
  });

  describe('closeSession', () => {
    it('should delete session from sessions map', async () => {
      const mockReq: any = { on: jest.fn() };
      await service.handleSseConnect(mockReq, {} as any);

      service.closeSession('test-session-id');

      const mockReqPost: any = {
        query: { sessionId: 'test-session-id' },
        headers: {},
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await service.handlePostMessage(mockReqPost, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
