# Model Context Protocol (MCP) Service

The MCP Service bridges the Waave Social Media Platform microservices with large language models (LLMs) using the Model Context Protocol (MCP) specification. It exposes core platform functionalities as tools and drives an autonomous AI agent to assist users by orchestrating multi-service workflows.

## What this service does

The service is responsible for:
- Implementing the official Model Context Protocol (MCP) SDK server.
- Exposing domain services (User, Post, Feed, Chat) as MCP tools.
- Managing SSE (Server-Sent Events) transports for real-time tool orchestration sessions.
- Exposing a NestJS gRPC controller and HTTP endpoints for chat agents and tool runners.
- Running a self-directed AI Agent (`AgentService`) powered by OpenAI (`gpt-4o-mini`) that parses natural language requests, plans tool invocations, executes them on the MCP server, and resolves comprehensive answers.

## Service architecture

The MCP Service is a NestJS application configured on HTTP/gRPC, hosting both the MCP Server instance (via SSE transport) and an LLM-driven MCP client agent.

```text
 Client Request
       │ (HTTP POST Prompt)
       ▼
 ┌──────────────┐
 │ AgentService │ ◄── [OpenAI Tool-Calling (gpt-4o-mini)]
 └──────┬───────┘
        │ (SSE Client Transport / Tool call requests)
        ▼
 ┌──────────────────┐
 │ McpServerService │ ◄── [McpServer SDK Instance]
 └──────┬───────────┘
        ├───────────────┼───────────────┼───────────────┐
        ▼               ▼               ▼               ▼
 ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 │ User Tools │   │ Post Tools │   │ Feed Tools │   │ Chat Tools │
 └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
       │ (gRPC)         │ (gRPC)         │ (gRPC)         │ (gRPC)
       ▼                ▼                ▼                ▼
  User Service     Post Service     Feed Service     Chat Service
```

### Internal connections

- **gRPC Clients**: Integrates shared gRPC client wrappers (`UserGrpcClient`, `PostGrpcClient`, `FeedGrpcClient`, `ChatGrpcClient`) to communicate with downstream platform services.
- **OpenAI Client Integration**: Connects to the OpenAI completions endpoint to route agent prompts and execute function-calling models.
- **SSE Transport Channels**: Connects the local agent client instance directly to `/mcp` endpoints to execute registered server tools.

---

## Main responsibilities

### 1. McpServer tool registry
Registers and schema-defines platform tools using Zod parameters:
- **User Tools (`registerUserTools`)**:
  - `get_user_profile`: Fetch profile by user ID.
  - `update_user_profile`: Update bio description, location, and website details.
  - `search_users`: Query users by name/email term.
  - `get_user_suggestions`: Recommended profiles list.
  - `follow_user` / `unfollow_user`: Manage follower/following links.
  - `get_followers` / `get_following`: List relations.
- **Post Tools (`registerPostTools`)**:
  - `create_post`: Publish content (content, location, feeling tags).
  - `get_post`: Retrieve a single post.
  - `get_user_posts`: Retrieve user posts with pagination.
  - `like_post` / `unlike_post`: Interact with posts.
  - `add_comment` / `get_comments`: Manage thread comments and replies.
- **Feed Tools (`registerFeedTools`)**:
  - `get_user_feed`: Personalized user home feed.
  - `get_explore_feed`: Algorithmic system explore content.
  - `get_trending_posts`: Top trending scores list.
- **Chat Tools (`registerChatTools`)**:
  - `get_user_conversations`: List active direct/group chat lists.
  - `get_chat_messages`: Conversation logging and content fetching.
  - `send_chat_message`: Send messages to chats.

### 2. Autonomous Agent Execution
Exposes the `AgentService.ask(userId, prompt)` interface:
- Establishes a local `SSEClientTransport` connection targeting the MCP instance.
- Queries server capabilities to gather registered tool definitions.
- Translates tools into OpenAI templates.
- Enters a loop (maximum 8 iterations) resolving tool calls consecutively, routing context parameters (like `userId` mapping) automatically to guard safety bounds.
- Generates execution logs (`trace`) mapping inputs and outputs for review.

---

## Service Endpoints & Interfaces

### HTTP REST API
- `GET /mcp`: Initiates Server-Sent Events (SSE) connection.
- `POST /mcp/messages`: Submits MCP client payloads to an active SSE session.
- `POST /mcp/agent/ask`: Submits a Prompt to trigger the AI Agent tool loop.

### gRPC Contract
Defined in `libs/proto-schema/src/proto/mcp.proto`:
- `McpService` exposes method `Ask` (payload inputs: `userId`, `prompt`; returns: `answer`, `success`, `trace`).

---

## Runtime ports

- gRPC: `3011`
- HTTP: `4011`

---

## Key folders

- `apps/mcp-service/src/mcp` – core controllers, module declarations, and agent wrappers
- `apps/mcp-service/src/mcp/agent` – agent logic using OpenAI parameters (`agent.service.ts`)
- `apps/mcp-service/src/tools` – registration modules mapping backend gRPC clients to MCP schemas
