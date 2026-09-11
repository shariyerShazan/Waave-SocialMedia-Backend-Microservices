import { Test, TestingModule } from '@nestjs/testing';
import { AgentGrpcController } from '../agent.grpc.controller';
import { AgentService } from '../agent.service';

describe('AgentGrpcController', () => {
  let controller: AgentGrpcController;
  let mockAgentService: any;

  beforeEach(async () => {
    mockAgentService = {
      ask: jest.fn().mockResolvedValue({
        success: true,
        message: 'Success',
        answer: 'Hello',
        trace: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentGrpcController],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compile();

    controller = module.get<AgentGrpcController>(AgentGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ask', () => {
    it('should delegate ask request to agentService.ask', async () => {
      const request = { userId: 'u1', prompt: 'Tell me a story' };
      const response = await controller.ask(request);

      expect(mockAgentService.ask).toHaveBeenCalledWith(
        'u1',
        'Tell me a story',
      );
      expect(response).toEqual({
        success: true,
        message: 'Success',
        answer: 'Hello',
        trace: [],
      });
    });
  });
});
