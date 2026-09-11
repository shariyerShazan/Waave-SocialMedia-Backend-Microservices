import { registerUserTools } from '../user.tools';
import { registerPostTools } from '../post.tools';
import { registerFeedTools } from '../feed.tools';
import { registerChatTools } from '../chat.tools';

describe('MCP Microservice Tools Registration', () => {
  let mockServer: any;
  let toolMap: Map<string, any>;

  beforeEach(() => {
    toolMap = new Map();
    mockServer = {
      tool: jest.fn(
        (name: string, description: string, schema: any, handler: any) => {
          toolMap.set(name, { description, schema, handler });
        },
      ),
    };
  });

  describe('User Tools', () => {
    let mockUserClient: any;

    beforeEach(() => {
      mockUserClient = {
        getProfile: jest.fn().mockResolvedValue({ id: 'u1', name: 'Alice' }),
        updateProfile: jest.fn().mockResolvedValue({ success: true }),
        searchUsers: jest.fn().mockResolvedValue({ users: [] }),
        getSuggestions: jest.fn().mockResolvedValue({ users: [] }),
        followUser: jest.fn().mockResolvedValue({ success: true }),
        unfollowUser: jest.fn().mockResolvedValue({ success: true }),
        getFollowers: jest.fn().mockResolvedValue({ followers: [] }),
        getFollowing: jest.fn().mockResolvedValue({ following: [] }),
      };
      registerUserTools(mockServer, mockUserClient);
    });

    it('should register 8 user tools', () => {
      expect(mockServer.tool).toHaveBeenCalledTimes(8);
    });

    it('should execute get_user_profile tool', async () => {
      const tool = toolMap.get('get_user_profile');
      const res = await tool.handler({ userId: 'u1', requesterId: 'u2' });

      expect(mockUserClient.getProfile).toHaveBeenCalledWith('u1', 'u2');
      expect(res).toEqual({
        content: [
          { type: 'text', text: JSON.stringify({ id: 'u1', name: 'Alice' }) },
        ],
      });
    });

    it('should execute update_user_profile tool', async () => {
      const tool = toolMap.get('update_user_profile');
      await tool.handler({ userId: 'u1', name: 'Bob', bio: 'Developer' });

      expect(mockUserClient.updateProfile).toHaveBeenCalledWith('u1', {
        name: 'Bob',
        bio: 'Developer',
        location: undefined,
        website: undefined,
      });
    });

    it('should execute search_users tool with defaults', async () => {
      const tool = toolMap.get('search_users');
      await tool.handler({ query: 'alice' });

      expect(mockUserClient.searchUsers).toHaveBeenCalledWith(
        'alice',
        '',
        1,
        20,
      );
    });

    it('should execute get_user_suggestions tool', async () => {
      const tool = toolMap.get('get_user_suggestions');
      await tool.handler({ userId: 'u1' });

      expect(mockUserClient.getSuggestions).toHaveBeenCalledWith('u1', 10);
    });

    it('should execute follow_user and unfollow_user tools', async () => {
      const followTool = toolMap.get('follow_user');
      const unfollowTool = toolMap.get('unfollow_user');

      await followTool.handler({ followerId: 'u1', targetId: 'u2' });
      expect(mockUserClient.followUser).toHaveBeenCalledWith('u1', 'u2');

      await unfollowTool.handler({ followerId: 'u1', targetId: 'u2' });
      expect(mockUserClient.unfollowUser).toHaveBeenCalledWith('u1', 'u2');
    });

    it('should execute get_followers and get_following tools', async () => {
      const followersTool = toolMap.get('get_followers');
      const followingTool = toolMap.get('get_following');

      await followersTool.handler({ userId: 'u1' });
      expect(mockUserClient.getFollowers).toHaveBeenCalledWith('u1', 1, 20);

      await followingTool.handler({ userId: 'u1' });
      expect(mockUserClient.getFollowing).toHaveBeenCalledWith('u1', 1, 20);
    });
  });

  describe('Post Tools', () => {
    let mockPostClient: any;

    beforeEach(() => {
      mockPostClient = {
        createPost: jest.fn().mockResolvedValue({ id: 'p1' }),
        getPost: jest.fn().mockResolvedValue({ id: 'p1' }),
        getUserPosts: jest.fn().mockResolvedValue({ posts: [] }),
        likePost: jest.fn().mockResolvedValue({ success: true }),
        unlikePost: jest.fn().mockResolvedValue({ success: true }),
        addComment: jest.fn().mockResolvedValue({ id: 'c1' }),
        getComments: jest.fn().mockResolvedValue({ comments: [] }),
      };
      registerPostTools(mockServer, mockPostClient);
    });

    it('should register 7 post tools', () => {
      expect(mockServer.tool).toHaveBeenCalledTimes(7);
    });

    it('should execute create_post tool', async () => {
      const tool = toolMap.get('create_post');
      await tool.handler({ userId: 'u1', content: 'Hello' });

      expect(mockPostClient.createPost).toHaveBeenCalledWith({
        userId: 'u1',
        content: 'Hello',
        feeling: undefined,
        location: undefined,
        privacy: undefined,
      });
    });

    it('should execute get_post tool', async () => {
      const tool = toolMap.get('get_post');
      await tool.handler({ postId: 'p1', requesterId: 'u1' });

      expect(mockPostClient.getPost).toHaveBeenCalledWith('p1', 'u1');
    });

    it('should execute get_user_posts tool', async () => {
      const tool = toolMap.get('get_user_posts');
      await tool.handler({ userId: 'u1' });

      expect(mockPostClient.getUserPosts).toHaveBeenCalledWith(
        'u1',
        'u1',
        1,
        20,
      );
    });

    it('should execute like_post and unlike_post tools', async () => {
      const likeTool = toolMap.get('like_post');
      const unlikeTool = toolMap.get('unlike_post');

      await likeTool.handler({ postId: 'p1', userId: 'u1' });
      expect(mockPostClient.likePost).toHaveBeenCalledWith('p1', 'u1');

      await unlikeTool.handler({ postId: 'p1', userId: 'u1' });
      expect(mockPostClient.unlikePost).toHaveBeenCalledWith('p1', 'u1');
    });

    it('should execute add_comment and get_comments tools', async () => {
      const addCommTool = toolMap.get('add_comment');
      const getCommTool = toolMap.get('get_comments');

      await addCommTool.handler({ postId: 'p1', userId: 'u1', text: 'Nice' });
      expect(mockPostClient.addComment).toHaveBeenCalledWith(
        'p1',
        'u1',
        'Nice',
        '',
      );

      await getCommTool.handler({ postId: 'p1' });
      expect(mockPostClient.getComments).toHaveBeenCalledWith('p1', '', 1, 20);
    });
  });

  describe('Feed Tools', () => {
    let mockFeedClient: any;

    beforeEach(() => {
      mockFeedClient = {
        getFeed: jest.fn().mockResolvedValue({ posts: [] }),
        getExploreFeed: jest.fn().mockResolvedValue({ posts: [] }),
        getTrendingPosts: jest.fn().mockResolvedValue({ posts: [] }),
      };
      registerFeedTools(mockServer, mockFeedClient);
    });

    it('should register 3 feed tools', () => {
      expect(mockServer.tool).toHaveBeenCalledTimes(3);
    });

    it('should execute get_user_feed tool', async () => {
      const tool = toolMap.get('get_user_feed');
      await tool.handler({ userId: 'u1' });

      expect(mockFeedClient.getFeed).toHaveBeenCalledWith('u1', 1, 20, '');
    });

    it('should execute get_explore_feed tool', async () => {
      const tool = toolMap.get('get_explore_feed');
      await tool.handler({ userId: 'u1' });

      expect(mockFeedClient.getExploreFeed).toHaveBeenCalledWith('u1', 1, 20);
    });

    it('should execute get_trending_posts tool', async () => {
      const tool = toolMap.get('get_trending_posts');
      await tool.handler({ limit: 10 });

      expect(mockFeedClient.getTrendingPosts).toHaveBeenCalledWith(10);
    });
  });

  describe('Chat Tools', () => {
    let mockChatClient: any;

    beforeEach(() => {
      mockChatClient = {
        getConversations: jest.fn().mockResolvedValue({ conversations: [] }),
        getOrCreateConversation: jest.fn().mockResolvedValue({ id: 'c1' }),
        createGroup: jest.fn().mockResolvedValue({ id: 'g1' }),
        addGroupMember: jest.fn().mockResolvedValue({ success: true }),
        removeGroupMember: jest.fn().mockResolvedValue({ success: true }),
        leaveGroup: jest.fn().mockResolvedValue({ success: true }),
        getMessages: jest.fn().mockResolvedValue({ messages: [] }),
        sendMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
        editMessage: jest.fn().mockResolvedValue({ success: true }),
        deleteMessage: jest.fn().mockResolvedValue({ success: true }),
        forwardMessage: jest.fn().mockResolvedValue({ success: true }),
        reactToMessage: jest.fn().mockResolvedValue({ success: true }),
        getUnreadCounts: jest.fn().mockResolvedValue({ total: 0 }),
      };
      registerChatTools(mockServer, mockChatClient);
    });

    it('should register 13 chat tools', () => {
      expect(mockServer.tool).toHaveBeenCalledTimes(13);
    });

    it('should execute get_user_conversations tool', async () => {
      const tool = toolMap.get('get_user_conversations');
      await tool.handler({ userId: 'u1' });

      expect(mockChatClient.getConversations).toHaveBeenCalledWith({
        userId: 'u1',
        page: 1,
        limit: 20,
        archived: undefined,
      });
    });

    it('should execute get_or_create_direct_conversation tool', async () => {
      const tool = toolMap.get('get_or_create_direct_conversation');
      await tool.handler({ userId: 'u1', targetUserId: 'u2' });

      expect(mockChatClient.getOrCreateConversation).toHaveBeenCalledWith({
        userId1: 'u1',
        userId2: 'u2',
      });
    });

    it('should execute send_chat_message tool', async () => {
      const tool = toolMap.get('send_chat_message');
      await tool.handler({
        conversationId: 'c1',
        senderId: 'u1',
        text: 'Hello!',
      });

      expect(mockChatClient.sendMessage).toHaveBeenCalledWith({
        conversationId: 'c1',
        senderId: 'u1',
        text: 'Hello!',
        mediaIds: [],
        replyTo: '',
      });
    });

    it('should execute group operations tools', async () => {
      const createGrp = toolMap.get('create_chat_group');
      const addMem = toolMap.get('add_chat_group_member');
      const remMem = toolMap.get('remove_chat_group_member');
      const leaveGrp = toolMap.get('leave_chat_group');

      await createGrp.handler({
        creatorId: 'u1',
        name: 'Group 1',
        participantIds: ['u1', 'u2'],
      });
      expect(mockChatClient.createGroup).toHaveBeenCalledWith({
        creatorId: 'u1',
        name: 'Group 1',
        participantIds: ['u1', 'u2'],
        avatar: '',
      });

      await addMem.handler({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u3',
      });
      expect(mockChatClient.addGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u3',
        role: 'MEMBER',
      });

      await remMem.handler({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u3',
      });
      expect(mockChatClient.removeGroupMember).toHaveBeenCalledWith({
        conversationId: 'c1',
        adminId: 'u1',
        userId: 'u3',
      });

      await leaveGrp.handler({ conversationId: 'c1', userId: 'u3' });
      expect(mockChatClient.leaveGroup).toHaveBeenCalledWith({
        conversationId: 'c1',
        userId: 'u3',
      });
    });

    it('should execute message interaction tools', async () => {
      const editMsg = toolMap.get('edit_chat_message');
      const delMsg = toolMap.get('delete_chat_message');
      const fwdMsg = toolMap.get('forward_chat_message');
      const reactMsg = toolMap.get('react_to_chat_message');
      const unreadMsg = toolMap.get('get_chat_unread_counts');

      await editMsg.handler({
        messageId: 'm1',
        senderId: 'u1',
        text: 'Edited',
      });
      expect(mockChatClient.editMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        senderId: 'u1',
        text: 'Edited',
      });

      await delMsg.handler({ messageId: 'm1', userId: 'u1' });
      expect(mockChatClient.deleteMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        forEveryone: false,
      });

      await fwdMsg.handler({
        sourceMessageId: 'm1',
        targetConversationId: 'c2',
        senderId: 'u1',
      });
      expect(mockChatClient.forwardMessage).toHaveBeenCalledWith({
        sourceMessageId: 'm1',
        targetConversationId: 'c2',
        senderId: 'u1',
      });

      await reactMsg.handler({ messageId: 'm1', userId: 'u1', emoji: '👍' });
      expect(mockChatClient.reactToMessage).toHaveBeenCalledWith({
        messageId: 'm1',
        userId: 'u1',
        emoji: '👍',
      });

      await unreadMsg.handler({ userId: 'u1' });
      expect(mockChatClient.getUnreadCounts).toHaveBeenCalledWith({
        userId: 'u1',
      });
    });
  });
});
