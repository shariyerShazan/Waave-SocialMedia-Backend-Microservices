# API Gateway

The API Gateway is the primary public entry point of the platform. It exposes dual **REST** and **GraphQL** APIs and coordinates communication with all downstream microservices via gRPC, insulating external clients from internal service topologies.

## What this service does

The gateway is responsible for:

- Exposing HTTP REST endpoints and GraphQL queries/mutations for clients
- Validating incoming request payloads (Class Validator DTOs & GraphQL Input Types)
- Orchestrating requests across all downstream microservices via gRPC clients (`auth`, `user`, `post`, `feed`, `chat`, `e2ee-chat`, `media`, `notification`, `mcp`)
- Serving interactive Swagger documentation at `/docs` and Apollo GraphQL Playground at `/graphql`
- Enforcing security, authentication (`AuthGuard`), and Redis-backed rate limiting (`RateLimitGuard`) across both REST and GraphQL interfaces

## Service architecture

The gateway is built as a NestJS application using Apollo Driver (`@nestjs/apollo`) for GraphQL and gRPC clients (`libs/grpc-clients` / `@app/clients`) to communicate with all backend services.

### Internal connections

- **Auth Service**: over gRPC (`AUTH_SERVICE_GRPC_URL`)
- **User Service**: over gRPC (`USER_SERVICE_GRPC_URL`)
- **Post Service**: over gRPC (`POST_SERVICE_GRPC_URL`)
- **Feed Service**: over gRPC (`FEED_SERVICE_GRPC_URL`)
- **Chat Service**: over gRPC (`CHAT_SERVICE_GRPC_URL`)
- **E2EE Chat Service**: over gRPC (`E2EE_CHAT_SERVICE_GRPC_URL`)
- **Media Service**: over gRPC (`MEDIA_SERVICE_GRPC_URL`)
- **Notification Service**: over gRPC (`NOTIFICATION_SERVICE_GRPC_URL`)
- **MCP Service**: over gRPC (`MCP_SERVICE_GRPC_URL`)
- **Redis**: for request rate limiting (`API_GATEWAY_REDIS_HOST`)

### External interfaces

- **REST API**: Endpoint routes across all domain controllers
- **GraphQL API**: Code-first schema generated at `schema.gql`
- **Swagger Docs**: Accessible at `http://localhost:4000/docs`
- **GraphQL Playground**: Accessible at `http://localhost:4000/graphql`

---

## GraphQL API Architecture

The API Gateway uses `@nestjs/graphql` with the Apollo Driver in code-first mode:

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'schema.gql'),
  sortSchema: true,
  playground: true,
  context: ({ req, res }) => ({ req, res }),
})
```

### GraphQL Resolvers Overview

Each domain module implements a dedicated GraphQL resolver mapping GraphQL operations to gRPC client calls:

1. **`AuthResolver`** (`apps/api-gateway/src/auth/auth.resolver.ts`)
   - **Mutations**: `register`, `verifyRegistration`, `login`, `refreshToken`, `forgotPassword`, `resetPassword`, `changePassword`, `logout`, `verifyMfa`, `revokeSession`, `revokeAllSessions`
   - **Queries**: `me`, `userById`, `userByEmail`, `allUsers`, `activeSessions`
2. **`UserResolver`** (`apps/api-gateway/src/user/user.resolver.ts`)
   - **Queries**: `userProfile`, `searchUsers`, `userSuggestions`, `followers`, `following`
   - **Mutations**: `updateProfile`, `followUser`, `unfollowUser`
3. **`PostResolver`** (`apps/api-gateway/src/post/post.resolver.ts`)
   - **Queries**: `post`, `userPosts`, `comments`
   - **Mutations**: `createPost`, `updatePost`, `deletePost`, `likePost`, `unlikePost`, `addComment`, `deleteComment`
4. **`FeedResolver`** (`apps/api-gateway/src/feed/feed.resolver.ts`)
   - **Queries**: `userFeed`, `exploreFeed`, `trendingPosts`
5. **`ChatResolver`** (`apps/api-gateway/src/chat/chat.resolver.ts`)
   - **Queries**: `userConversations`, `chatMessages`
   - **Mutations**: `createDirectConversation`, `createGroupConversation`, `sendMessage`, `recallMessage`, `addReaction`, `removeReaction`
6. **`E2eeChatResolver`** (`apps/api-gateway/src/e2ee-chat/e2ee-chat.resolver.ts`)
   - **Queries**: `e2eeConversations`, `e2eeMessages`
   - **Mutations**: `createE2eeDirectConversation`, `createE2eeGroupConversation`, `sendE2eeMessage`
7. **`MediaResolver`** (`apps/api-gateway/src/media/media.resolver.ts`)
   - **Queries**: `media`, `userMedia`
   - **Mutations**: `deleteMedia`
8. **`NotificationResolver`** (`apps/api-gateway/src/notification/notification.resolver.ts`)
   - **Queries**: `notifications`, `notificationPreferences`
   - **Mutations**: `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `updateNotificationPreferences`
9. **`McpResolver`** (`apps/api-gateway/src/mcp/mcp.resolver.ts`)
   - **Queries / Mutations**: `askMcpAgent`

---

## Rate Limiting & Security Context

The API Gateway supports execution context extraction for both HTTP controllers and GraphQL resolvers:

- **`AuthGuard`**: Extracts JWT authorization headers from `req` (HTTP) or `GqlExecutionContext.create(ctx).getContext().req` (GraphQL).
- **`RateLimitGuard`**: Computes rate-limiting keys using client IP, email, or authenticated user ID, storing rate limits in Redis (`RedisGW`).

---

## Communication model

### Incoming

- **HTTP/REST** requests from clients
- **GraphQL** queries and mutations from clients

### Outgoing

- **gRPC** calls to all 9 backend microservices
- **Redis** operations for rate limit tracking

---

## Runtime ports

- HTTP / GraphQL: `4000`

---

## Key folders

- `apps/api-gateway/src/auth` – REST controller, GraphQL resolver (`auth.resolver.ts`), and DTOs (`auth.graphql.types.ts`)
- `apps/api-gateway/src/user` – REST controller, GraphQL resolver (`user.resolver.ts`), and DTOs (`user.graphql.types.ts`)
- `apps/api-gateway/src/post` – REST controller, GraphQL resolver (`post.resolver.ts`), and DTOs (`post.graphql.types.ts`)
- `apps/api-gateway/src/feed` – REST controller, GraphQL resolver (`feed.resolver.ts`), and DTOs (`feed.graphql.types.ts`)
- `apps/api-gateway/src/chat` – REST controller, GraphQL resolver (`chat.resolver.ts`), and DTOs (`chat.graphql.types.ts`)
- `apps/api-gateway/src/e2ee-chat` – REST controller, GraphQL resolver (`e2ee-chat.resolver.ts`), and DTOs (`e2ee-chat.graphql.types.ts`)
- `apps/api-gateway/src/media` – REST controller, GraphQL resolver (`media.resolver.ts`), and DTOs (`media.graphql.types.ts`)
- `apps/api-gateway/src/notification` – REST controller, GraphQL resolver (`notification.resolver.ts`), and DTOs (`notification.graphql.types.ts`)
- `apps/api-gateway/src/mcp` – REST controller, GraphQL resolver (`mcp.resolver.ts`), and DTOs (`mcp.graphql.types.ts`)
- `apps/api-gateway/src/rateLimit` – Redis-backed rate limiter, guard, and decorators

---

## Design summary

The API Gateway is intentionally thin and orchestration-focused. It provides dual REST and GraphQL public interfaces over a code-first GraphQL schema, delegating domain business logic to downstream microservices over synchronous gRPC channels.
