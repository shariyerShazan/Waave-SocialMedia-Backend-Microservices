import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PostGrpcClient } from 'libs/grpc-clients/src';

export function registerPostTools(
  server: McpServer,
  postClient: PostGrpcClient,
) {
  server.tool(
    'create_post',
    'Publish a new post with text content and optional metadata',
    {
      userId: z.string().describe('Authenticated author user ID'),
      content: z.string().optional().describe('Text body of the post'),
      feeling: z.string().optional().describe('Feeling/emotion tag'),
      location: z.string().optional().describe('Location tag'),
      privacy: z
        .number()
        .optional()
        .describe('0 for PUBLIC, 1 for FRIENDS, 2 for PRIVATE'),
    },
    async ({ userId, content, feeling, location, privacy }) => {
      const res = await postClient.createPost({
        userId,
        content,
        feeling,
        location,
        privacy,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_post',
    'Get details of a single post by postId',
    {
      postId: z.string().describe('Target post ID'),
      requesterId: z
        .string()
        .optional()
        .describe('Authenticated caller user ID'),
    },
    async ({ postId, requesterId }) => {
      const res = await postClient.getPost(postId, requesterId || '');
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_user_posts',
    'Fetch published posts for a specific target user',
    {
      userId: z.string().describe('Target author user ID'),
      requesterId: z
        .string()
        .optional()
        .describe('Authenticated caller user ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ userId, requesterId, page, limit }) => {
      const res = await postClient.getUserPosts(
        userId,
        requesterId || userId,
        page || 1,
        limit || 20,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'like_post',
    'Like a post by postId',
    {
      postId: z.string().describe('Target post ID to like'),
      userId: z.string().describe('Authenticated caller user ID'),
    },
    async ({ postId, userId }) => {
      const res = await postClient.likePost(postId, userId);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'unlike_post',
    'Remove like reaction from a post by postId',
    {
      postId: z.string().describe('Target post ID to unlike'),
      userId: z.string().describe('Authenticated caller user ID'),
    },
    async ({ postId, userId }) => {
      const res = await postClient.unlikePost(postId, userId);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'add_comment',
    'Post a comment on a specific post',
    {
      postId: z.string().describe('Target post ID'),
      userId: z.string().describe('Authenticated commenter user ID'),
      text: z.string().describe('Text of the comment'),
      parentId: z.string().optional().describe('Parent comment ID if replying'),
    },
    async ({ postId, userId, text, parentId }) => {
      const res = await postClient.addComment(
        postId,
        userId,
        text,
        parentId || '',
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_comments',
    'List comments on a post',
    {
      postId: z.string().describe('Target post ID'),
      parentId: z
        .string()
        .optional()
        .describe('Parent comment ID if querying replies'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ postId, parentId, page, limit }) => {
      const res = await postClient.getComments(
        postId,
        parentId || '',
        page || 1,
        limit || 20,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );
}
