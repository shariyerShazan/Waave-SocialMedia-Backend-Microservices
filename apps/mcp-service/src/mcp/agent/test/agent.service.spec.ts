import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from '../agent.service';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import OpenAI from 'openai';

jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');
jest.mock('openai');

describe('AgentService', () => {
  let service: AgentService;
  let mockClient: any;
  let mockTransport: any;
  let mockOpenAI: any;

  beforeEach(async () => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          {
            name: 'get_user_feed',
            description: 'Get user feed',
            inputSchema: { type: 'object' },
          },
        ],
      }),
      callTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"posts":[]}' }],
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockTransport = {};

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Here is your feed summary.',
                  tool_calls: null,
                },
              },
            ],
          }),
        },
      },
    };

    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);
    (SSEClientTransport as unknown as jest.Mock).mockImplementation(
      () => mockTransport,
    );
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentService],
    }).compile();

    service = module.get<AgentService>(AgentService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ask', () => {
    it('should complete query without tool calls when model returns text directly', async () => {
      const res = await service.ask('u1', 'Hello Waave');

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.listTools).toHaveBeenCalled();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(res).toEqual({
        success: true,
        message: 'Query processed successfully',
        answer: 'Here is your feed summary.',
        trace: [],
      });
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle tool calls requested by OpenAI model, map userId args, and return final answer', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call-1',
                    function: {
                      name: 'get_user_feed',
                      arguments: JSON.stringify({ userId: 'placeholder' }),
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'You have 0 new posts.',
                tool_calls: null,
              },
            },
          ],
        });

      const res = await service.ask('user-99', 'Show my feed');

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'get_user_feed',
        arguments: expect.objectContaining({ userId: 'user-99' }),
      });
      expect(res.success).toBe(true);
      expect(res.answer).toBe('You have 0 new posts.');
      expect(res.trace).toHaveLength(1);
      expect(res.trace[0].toolName).toBe('get_user_feed');
      expect(res.trace[0].result).toBe('{"posts":[]}');
    });

    it('should handle tool execution error gracefully and record trace', async () => {
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call-2',
                    function: {
                      name: 'get_user_feed',
                      arguments: 'invalid-json',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Failed to fetch feed.',
                tool_calls: null,
              },
            },
          ],
        });

      mockClient.callTool.mockRejectedValueOnce(new Error('Tool timeout'));

      const res = await service.ask('user-99', 'Fetch feed');

      expect(res.success).toBe(true);
      expect(res.trace[0].result).toContain('Tool timeout');
    });

    it('should catch error if client connect or listTools fails and return success false', async () => {
      mockClient.connect.mockRejectedValueOnce(
        new Error('SSE connection failed'),
      );

      const res = await service.ask('user-1', 'Hi');

      expect(res).toEqual({
        success: false,
        message: 'SSE connection failed',
        answer: '',
        trace: [],
      });
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
