import { Test, TestingModule } from '@nestjs/testing';
import { McpResolver } from '../mcp.resolver';
import { McpGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('McpResolver', () => {
  let resolver: McpResolver;
  let mcpClient: jest.Mocked<McpGrpcClient>;

  beforeEach(async () => {
    const mockMcpGrpcClient = {
      ask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpResolver,
        { provide: McpGrpcClient, useValue: mockMcpGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<McpResolver>(McpResolver);
    mcpClient = module.get(McpGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('askAgent', () => {
    it('should call mcpClient.ask', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { prompt: 'Hello agent' };
      mcpClient.ask.mockResolvedValue({ answer: 'Hi' } as any);

      const res = await resolver.askAgent(ctx, input);
      expect(mcpClient.ask).toHaveBeenCalledWith('u1', 'Hello agent');
      expect(res).toEqual({ answer: 'Hi' });
    });
  });
});
