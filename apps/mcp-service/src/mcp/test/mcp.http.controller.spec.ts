import { Test, TestingModule } from '@nestjs/testing';
import { McpHttpController } from '../mcp.http.controller';
import { McpServerService } from '../mcp.service';

describe('McpHttpController', () => {
  let controller: McpHttpController;
  let mockMcpServerService: any;

  beforeEach(async () => {
    mockMcpServerService = {
      handleSseConnect: jest.fn().mockResolvedValue(undefined),
      handlePostMessage: jest.fn().mockResolvedValue(undefined),
      closeSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpHttpController],
      providers: [
        { provide: McpServerService, useValue: mockMcpServerService },
      ],
    }).compile();

    controller = module.get<McpHttpController>(McpHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleSseConnect', () => {
    it('should delegate to mcpServerService.handleSseConnect', async () => {
      const mockReq: any = {};
      const mockRes: any = {};

      await controller.handleSseConnect(mockReq, mockRes);

      expect(mockMcpServerService.handleSseConnect).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });
  });

  describe('handlePostRoot & handlePostMessages', () => {
    it('should delegate handlePostRoot to mcpServerService.handlePostMessage', async () => {
      const mockReq: any = {};
      const mockRes: any = {};

      await controller.handlePostRoot(mockReq, mockRes);

      expect(mockMcpServerService.handlePostMessage).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });

    it('should delegate handlePostMessages to mcpServerService.handlePostMessage', async () => {
      const mockReq: any = {};
      const mockRes: any = {};

      await controller.handlePostMessages(mockReq, mockRes);

      expect(mockMcpServerService.handlePostMessage).toHaveBeenCalledWith(
        mockReq,
        mockRes,
      );
    });
  });

  describe('closeSession', () => {
    it('should delegate closeSession to service and return 200 JSON status', () => {
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      controller.closeSession('session-123', mockRes);

      expect(mockMcpServerService.closeSession).toHaveBeenCalledWith(
        'session-123',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session session-123 terminated',
      });
    });
  });
});
