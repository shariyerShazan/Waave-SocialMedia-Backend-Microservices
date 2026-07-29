import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FeedGrpcClient } from 'libs/grpc-clients/src';

export function registerFeedTools(
  server: McpServer,
  feedClient: FeedGrpcClient,
) {
  server.tool(
    'get_user_feed',
    'Get personalized home feed for the authenticated user',
    {
      userId: z
        .string()
        .describe('Authenticated user ID requesting their feed'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
      cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async ({ userId, page, limit, cursor }) => {
      const res = await feedClient.getFeed(
        userId,
        page || 1,
        limit || 20,
        cursor || '',
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_explore_feed',
    'Get algorithmic explore feed with popular or recommended content',
    {
      userId: z.string().describe('Authenticated user ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ userId, page, limit }) => {
      const res = await feedClient.getExploreFeed(
        userId,
        page || 1,
        limit || 20,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_trending_posts',
    'Get global trending posts across the platform',
    {
      limit: z
        .number()
        .optional()
        .describe('Maximum number of trending posts to return'),
    },
    async ({ limit }) => {
      const res = await feedClient.getTrendingPosts(limit || 20);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );
}
