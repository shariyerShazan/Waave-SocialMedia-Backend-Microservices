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
      archived: z.boolean().optional().describe('Filter archived status'),
    },
    async ({ userId, page, limit, archived }) => {
      const res = await chatClient.getConversations({
        userId,
        page: page || 1,
        limit: limit || 20,
        archived,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_or_create_direct_conversation',
    'Start or get direct 1-on-1 conversation with another user',
    {
      userId: z.string().describe('Authenticated caller user ID'),
      targetUserId: z.string().describe('Target recipient user ID'),
    },
    async ({ userId, targetUserId }) => {
      const res = await chatClient.getOrCreateConversation({
        userId1: userId,
        userId2: targetUserId,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'create_chat_group',
    'Create a group chat conversation',
    {
      creatorId: z.string().describe('Group creator user ID'),
      name: z.string().describe('Group name'),
      participantIds: z.array(z.string()).describe('Participant user IDs'),
      avatar: z.string().optional().describe('Group avatar URL or ID'),
    },
    async ({ creatorId, name, participantIds, avatar }) => {
      const res = await chatClient.createGroup({
        creatorId,
        name,
        participantIds,
        avatar: avatar ?? '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'add_chat_group_member',
    'Add a member to a group conversation',
    {
      conversationId: z.string().describe('Group conversation ID'),
      adminId: z.string().describe('Admin/Owner user ID'),
      userId: z.string().describe('Target member user ID to add'),
      role: z.enum(['ADMIN', 'MEMBER']).optional().describe('Member role'),
    },
    async ({ conversationId, adminId, userId, role }) => {
      const res = await chatClient.addGroupMember({
        conversationId,
        adminId,
        userId,
        role: role ?? 'MEMBER',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'remove_chat_group_member',
    'Remove a member from a group conversation',
    {
      conversationId: z.string().describe('Group conversation ID'),
      adminId: z.string().describe('Admin/Owner user ID'),
      userId: z.string().describe('Target member user ID to remove'),
    },
    async ({ conversationId, adminId, userId }) => {
      const res = await chatClient.removeGroupMember({
        conversationId,
        adminId,
        userId,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'leave_chat_group',
    'Leave a group conversation',
    {
      conversationId: z.string().describe('Group conversation ID'),
      userId: z.string().describe('Authenticated member user ID'),
    },
    async ({ conversationId, userId }) => {
      const res = await chatClient.leaveGroup({
        conversationId,
        userId,
      });
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
      const res = await chatClient.getMessages({
        conversationId,
        userId,
        page: page || 1,
        limit: limit || 50,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'send_chat_message',
    'Send a chat message to a conversation',
    {
      conversationId: z.string().describe('Target conversation ID'),
      senderId: z.string().describe('Authenticated sender user ID'),
      text: z.string().describe('Message content text'),
      mediaIds: z.array(z.string()).optional().describe('Media attachment IDs'),
      replyTo: z.string().optional().describe('Reply-to message ID'),
    },
    async ({ conversationId, senderId, text, mediaIds, replyTo }) => {
      const res = await chatClient.sendMessage({
        conversationId,
        senderId,
        text,
        mediaIds: mediaIds ?? [],
        replyTo: replyTo ?? '',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'edit_chat_message',
    'Edit a previously sent message',
    {
      messageId: z.string().describe('Message ID to edit'),
      senderId: z.string().describe('Sender user ID'),
      text: z.string().describe('Updated message text'),
    },
    async ({ messageId, senderId, text }) => {
      const res = await chatClient.editMessage({
        messageId,
        senderId,
        text,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'delete_chat_message',
    'Delete a chat message',
    {
      messageId: z.string().describe('Message ID to delete'),
      userId: z.string().describe('Authenticated user ID'),
      forEveryone: z.boolean().optional().describe('Delete for everyone'),
    },
    async ({ messageId, userId, forEveryone }) => {
      const res = await chatClient.deleteMessage({
        messageId,
        userId,
        forEveryone: forEveryone ?? false,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'forward_chat_message',
    'Forward a message to another conversation',
    {
      sourceMessageId: z.string().describe('Source message ID to forward'),
      targetConversationId: z.string().describe('Target conversation ID'),
      senderId: z.string().describe('Authenticated sender user ID'),
    },
    async ({ sourceMessageId, targetConversationId, senderId }) => {
      const res = await chatClient.forwardMessage({
        sourceMessageId,
        targetConversationId,
        senderId,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'react_to_chat_message',
    'Add or remove an emoji reaction on a message',
    {
      messageId: z.string().describe('Message ID'),
      userId: z.string().describe('Authenticated user ID'),
      emoji: z.string().describe('Emoji character'),
    },
    async ({ messageId, userId, emoji }) => {
      const res = await chatClient.reactToMessage({
        messageId,
        userId,
        emoji,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );

  server.tool(
    'get_chat_unread_counts',
    'Get total and per-conversation unread message counts for user',
    {
      userId: z.string().describe('Authenticated user ID'),
    },
    async ({ userId }) => {
      const res = await chatClient.getUnreadCounts({
        userId,
      });
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    },
  );
}
