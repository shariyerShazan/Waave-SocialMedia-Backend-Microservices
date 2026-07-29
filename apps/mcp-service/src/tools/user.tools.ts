import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UserGrpcClient } from 'libs/grpc-clients/src';

export function registerUserTools(
  server: McpServer,
  userClient: UserGrpcClient,
) {
  server.tool(
    'get_user_profile',
    'Fetch profile details for a user by target userId',
    {
      userId: z
        .string()
        .describe('Target user ID whose profile is being requested'),
      requesterId: z
        .string()
        .optional()
        .describe('Authenticated caller user ID'),
    },
    async ({ userId, requesterId }) => {
      const profile = await userClient.getProfile(
        userId,
        requesterId || userId,
      );
      return { content: [{ type: 'text', text: JSON.stringify(profile) }] };
    },
  );

  server.tool(
    'update_user_profile',
    'Update profile metadata (name, bio, location, website) for the caller',
    {
      userId: z.string().describe('Authenticated caller user ID'),
      name: z.string().optional().describe('Updated full name'),
      bio: z.string().optional().describe('Updated biography text'),
      location: z.string().optional().describe('Updated location string'),
      website: z.string().optional().describe('Updated website URL'),
    },
    async ({ userId, name, bio, location, website }) => {
      const res = await userClient.updateProfile(userId, {
        name,
        bio,
        location,
        website,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'search_users',
    'Search platform users by text query string',
    {
      query: z.string().describe('Search term for username or name'),
      requesterId: z
        .string()
        .optional()
        .describe('Authenticated caller user ID'),
      page: z.number().optional().describe('Pagination page number'),
      limit: z.number().optional().describe('Pagination page size limit'),
    },
    async ({ query, requesterId, page, limit }) => {
      const res = await userClient.searchUsers(
        query,
        requesterId || '',
        page || 1,
        limit || 20,
      );
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_user_suggestions',
    'Get recommended user accounts to follow',
    {
      userId: z.string().describe('Authenticated caller user ID'),
      limit: z.number().optional().describe('Maximum count of suggestions'),
    },
    async ({ userId, limit }) => {
      const res = await userClient.getSuggestions(userId, limit || 10);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'follow_user',
    'Follow a target user account',
    {
      followerId: z
        .string()
        .describe('Authenticated caller user ID initiating the follow'),
      targetId: z.string().describe('Target user ID to follow'),
    },
    async ({ followerId, targetId }) => {
      const res = await userClient.followUser(followerId, targetId);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'unfollow_user',
    'Unfollow a target user account',
    {
      followerId: z
        .string()
        .describe('Authenticated caller user ID initiating unfollow'),
      targetId: z.string().describe('Target user ID to unfollow'),
    },
    async ({ followerId, targetId }) => {
      const res = await userClient.unfollowUser(followerId, targetId);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_followers',
    'Get list of followers for a user',
    {
      userId: z.string().describe('Target user ID to query followers for'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ userId, page, limit }) => {
      const res = await userClient.getFollowers(userId, page || 1, limit || 20);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_following',
    'Get list of users a target user is following',
    {
      userId: z.string().describe('Target user ID to query following list for'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Page size limit'),
    },
    async ({ userId, page, limit }) => {
      const res = await userClient.getFollowing(userId, page || 1, limit || 20);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );
}
