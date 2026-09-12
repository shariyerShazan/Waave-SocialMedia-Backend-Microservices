import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from '../mcp.controller';
import { McpGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('McpController', () => {
  let controller: McpController;
  let mcpClient: jest.Mocked<McpGrpcClient>;

  beforeEach(async () => {
    const mockMcpGrpcClient = {
      ask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [{ provide: McpGrpcClient, useValue: mockMcpGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<McpController>(McpController);
    mcpClient = module.get(McpGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ask', () => {
    it('should call mcpClient.ask with userId and prompt', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { prompt: 'What is the weather today?' };
      mcpClient.ask.mockResolvedValue({ answer: 'Sun' } as any);

      const res = await controller.ask(req, dto);
      expect(mcpClient.ask).toHaveBeenCalledWith(
        'u1',
        'What is the weather today?',
      );
      expect(res).toEqual({ answer: 'Sun' });
    });
  });
});
