/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';

export interface ToolTraceItem {
  toolName: string;
  rawArgs: string;
  result: string;
}

export interface AgentAskResponse {
  success: boolean;
  message: string;
  answer: string;
  trace: ToolTraceItem[];
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  async ask(userId: string, prompt: string): Promise<AgentAskResponse> {
    const httpPort = process.env.MCP_HTTP_PORT || '4010';
    const mcpUrl = `http://localhost:${httpPort}/mcp`;

    const transport = new SSEClientTransport(new URL(mcpUrl));
    const client = new Client(
      { name: 'Waave-Agent-Client', version: '1.0.0' },
      { capabilities: {} },
    );

    const trace: ToolTraceItem[] = [];

    try {
      await client.connect(transport);

      // Dynamically list tools available on the MCP server
      const { tools } = await client.listTools();

      // Convert MCP tool schemas into OpenAI function-calling tool format
      const openAiTools: ChatCompletionTool[] = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description || '',
          parameters: (t.inputSchema as Record<string, any>) || {
            type: 'object',
            properties: {},
          },
        },
      }));

      const apiKey = process.env.OPENAI_API_KEY || 'mock-key-if-not-set';
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const openai = new OpenAI({ apiKey });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are Waave AI Assistant, an agent for the Waave Social Media Platform. 
Use available tools to assist the user. The current authenticated user's ID is "${userId}".`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const maxIterations = 8;
      let iteration = 0;
      let finalAnswer = '';

      while (iteration < maxIterations) {
        iteration++;

        const completion = await openai.chat.completions.create({
          model,
          messages,
          tools: openAiTools.length > 0 ? openAiTools : undefined,
          tool_choice: openAiTools.length > 0 ? 'auto' : undefined,
        });

        const choice = completion.choices[0];
        const message = choice.message;

        messages.push(message);

        // If model returns final content without tool calls, we are done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          finalAnswer = message.content || 'No response generated.';
          break;
        }

        // Process all tool calls requested by the model
        for (const toolCall of message.tool_calls) {
          const toolName = (toolCall as any).function.name;
          let rawArgs: Record<string, any> = {};

          try {
            rawArgs = JSON.parse((toolCall as any).function.arguments || '{}');
          } catch {
            rawArgs = {};
          }

          const callerIdFields = [
            'userId',
            'requesterId',
            'followerId',
            'creatorId',
            'senderId',
          ];
          for (const field of callerIdFields) {
            if (
              field in rawArgs ||
              toolName.includes('user') ||
              toolName.includes('feed') ||
              toolName.includes('post') ||
              toolName.includes('chat')
            ) {
              if (
                field === 'requesterId' ||
                field === 'followerId' ||
                field === 'creatorId' ||
                field === 'senderId'
              ) {
                rawArgs[field] = userId;
              } else if (field === 'userId') {
                // For tools like get_user_feed, update_user_profile, create_post, like_post where userId is caller
                if (
                  [
                    'get_user_feed',
                    'get_explore_feed',
                    'update_user_profile',
                    'create_post',
                    'like_post',
                    'unlike_post',
                    'add_comment',
                    'get_user_conversations',
                    'get_user_suggestions',
                  ].includes(toolName)
                ) {
                  rawArgs[field] = userId;
                }
              }
            }
          }

          // Execute tool call on the MCP server via standard MCP client transport
          let resultText = '';
          try {
            const toolResult = await client.callTool({
              name: toolName,
              arguments: rawArgs,
            });

            if (Array.isArray(toolResult.content)) {
              resultText = toolResult.content
                .map((c: any) =>
                  c.type === 'text' ? c.text : JSON.stringify(c),
                )
                .join('\n');
            } else {
              resultText = JSON.stringify(toolResult);
            }
          } catch (err: any) {
            resultText = JSON.stringify({
              error: err?.message || 'Tool execution error',
            });
          }

          trace.push({
            toolName,
            rawArgs: JSON.stringify(rawArgs),
            result: resultText,
          });

          // Append tool execution result back into OpenAI message context
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultText,
          });
        }
      }

      if (!finalAnswer && iteration >= maxIterations) {
        finalAnswer =
          'Agent reached maximum iteration limit without finalizing answer.';
      }

      return {
        success: true,
        message: 'Query processed successfully',
        answer: finalAnswer,
        trace,
      };
    } catch (error: any) {
      this.logger.error(`Agent error: ${error?.message}`, error?.stack);
      return {
        success: false,
        message: error?.message || 'Failed to execute agent query',
        answer: '',
        trace: [],
      };
    } finally {
      try {
        await client.close();
      } catch {
        // Ignore closing errors
      }
    }
  }
}
