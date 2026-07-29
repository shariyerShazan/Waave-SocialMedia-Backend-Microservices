import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Response, Request } from 'express';
import {
  UserGrpcClient,
  PostGrpcClient,
  FeedGrpcClient,
  ChatGrpcClient,
} from 'libs/grpc-clients/src';
import { registerUserTools } from '../tools/user.tools';
import { registerPostTools } from '../tools/post.tools';
import { registerFeedTools } from '../tools/feed.tools';
import { registerChatTools } from '../tools/chat.tools';

export interface McpSession {
  sessionId: string;
  server: McpServer;
  transport: SSEServerTransport;
}

@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);
  private readonly sessions = new Map<string, McpSession>();

  constructor(
    private readonly userClient: UserGrpcClient,
    private readonly postClient: PostGrpcClient,
    private readonly feedClient: FeedGrpcClient,
    private readonly chatClient: ChatGrpcClient,
  ) {}

  /**
   * Instantiate an McpServer instance for a session and attach all microservice gRPC wrapper tools.
   */
  private createMcpServer(): McpServer {
    const server = new McpServer({
      name: 'Waave-MCP-Server',
      version: '1.0.0',
    });

    registerUserTools(server, this.userClient);
    registerPostTools(server, this.postClient);
    registerFeedTools(server, this.feedClient);
    registerChatTools(server, this.chatClient);

    return server;
  }

  async handleSseConnect(req: Request, res: Response): Promise<void> {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const server = this.createMcpServer();

    await server.connect(transport);
    const sessionId = transport.sessionId;

    this.sessions.set(sessionId, { sessionId, server, transport });
    this.logger.log(`MCP Session initialized: ${sessionId}`);

    req.on('close', () => {
      this.closeSession(sessionId);
    });
  }

  async handlePostMessage(
    req: Request,
    res: Response,
    sessionIdFromQueryOrHeader?: string,
  ): Promise<void> {
    const sessionId =
      (req.query.sessionId as string) ||
      (req.headers['mcp-session-id'] as string) ||
      sessionIdFromQueryOrHeader;

    if (!sessionId) {
      res
        .status(400)
        .json({ error: 'Missing mcp-session-id header or query param' });
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      res
        .status(404)
        .json({ error: `Session ${sessionId} not found or expired` });
      return;
    }

    await session.transport.handlePostMessage(req, res);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.logger.log(`MCP Session closed: ${sessionId}`);
    }
  }
}
