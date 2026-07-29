import { ChatGrpcClient } from 'libs/grpc-clients/src';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerChatTools(
  server: McpServer,
  chatClient: ChatGrpcClient,
) {
  server.tool(
    'get_user_conversations',
    'List chat conversations for the authenticated user',
    {
      userId: z.string().describe('Authenticated user ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ userId, page, limit }) => {
      const res = await chatClient.getConversations(
        userId,
        page || 1,
        limit || 20,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_chat_messages',
    'Get message history for a conversation',
    {
      conversationId: z.string().describe('Target conversation ID'),
      userId: z.string().describe('Authenticated caller user ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ conversationId, userId, page, limit }) => {
      const res = await chatClient.getMessages(
        conversationId,
        userId,
        page || 1,
        limit || 50,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'send_chat_message',
    'Send a direct chat message to a conversation',
    {
      conversationId: z.string().describe('Target conversation ID'),
      senderId: z.string().describe('Authenticated sender user ID'),
      text: z.string().describe('Message content text'),
    },
    async ({ conversationId, senderId, text }) => {
      const res = await chatClient.sendMessage({
        conversationId,
        senderId,
        text,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );
}
