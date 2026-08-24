# Project Structure

This repository is a NestJS monorepo for a multi-service product platform. It is organized around clear application boundaries so each domain can evolve independently while still participating in the larger system.

## High-level layout

```text
Waave/
├── apps/                  # Independent NestJS applications
├── libs/                  # Shared libraries and generated proto types
├── storage/               # Local storage for uploaded media assets
├── docker/                 # Infrastructure for databases, Redis, and Kafka
├── package.json           # Workspace scripts and dependencies
└── README.md              # Project overview
```

## Applications

### `apps/api-gateway`

This is the public entry point for clients.

It exposes REST endpoints and GraphQL queries/mutations, acting as the orchestrator for downstream microservices.

Responsibilities:

- Dual REST and GraphQL API surfaces
- Code-first GraphQL schema generation (`schema.gql`) and Apollo Playground at `/graphql`
- Swagger documentation at `/docs`
- Authentication, user, post, feed, chat, e2ee-chat, media, notification, and mcp routes/resolvers
- gRPC client integration for all 9 microservices
- Rate limiting and gateway-level protections (`RateLimitGuard`, `AuthGuard`)

Key folders:

- `src/auth` – auth REST controller, `auth.resolver.ts`, `auth.graphql.types.ts`, and gRPC client
- `src/user` – user REST controller, `user.resolver.ts`, `user.graphql.types.ts`, and gRPC client
- `src/post` – post REST controller, `post.resolver.ts`, `post.graphql.types.ts`, and gRPC client
- `src/feed` – feed REST controller, `feed.resolver.ts`, `feed.graphql.types.ts`, and gRPC client
- `src/chat` – chat REST controller, `chat.resolver.ts`, `chat.graphql.types.ts`, and gRPC client
- `src/e2ee-chat` – e2ee-chat REST controller, `e2ee-chat.resolver.ts`, `e2ee-chat.graphql.types.ts`, and gRPC client
- `src/media` – media REST controller, `media.resolver.ts`, `media.graphql.types.ts`, and gRPC client
- `src/notification` – notification REST controller, `notification.resolver.ts`, `notification.graphql.types.ts`, and gRPC client
- `src/mcp` – mcp REST controller, `mcp.resolver.ts`, `mcp.graphql.types.ts`, and gRPC client
- `src/rateLimit` – rate limiting module, guards, and decorators

### `apps/auth-service`

This service owns identity, authentication, and token handling.

Key folders:

- `src/auth` – registration, login, password reset, and verification logic
- `src/token` – JWT generation and validation
- `src/redis` – Redis-backed state management
- `src/prisma` – Prisma service for PostgreSQL access
- `prisma` – schema and migration files

### `apps/user-service`

This service manages profile data and social relationships.

Key folders:

- `src/user` – profile, follower, following, search, and presence logic
- `src/prisma` – Prisma integration for PostgreSQL
- `src/redis` – profile and presence caching

### `apps/media-service`

This service manages media workflows and metadata.

Key folders:

- `src/media` – media CRUD and metadata operations
- `src/processing` – image/video processing logic
- `src/storage` – storage adapter and file persistence
- `src/schemas` – Mongoose schema definitions
- `src/redis` – media cache

### `apps/notification-service`

This service is responsible for outbound notifications.

Key folders:

- `src/email` – email delivery implementation
- `src/notification` – Kafka consumer handlers

### `apps/post-service`

This service manages posts and scheduled workflows.

Key folders:

- `src/post` – post CRUD, publish, and revision logic
- `src/prisma` – Prisma schema and database access
- `src/scheduler` – scheduled job handlers

### `apps/chat-service`

This service manages real-time messaging, group chats, reactions, read status mapping, and Socket.io gateways.

Key folders:

- `src/chat` - WebSocket gateways and controllers
- `src/schemas` - Mongoose database schemas in MongoDB

### `apps/e2ee-chat-service`

This service facilitates E2EE (End-to-End Encrypted) direct and group messaging, routing Double Ratchet envelopes and client cryptograms.

Key folders:

- `src/e2ee-chat` - Controllers, services, and Socket.io gateways
- `prisma` - PostgreSQL schematics for message envelopes, receipts, reactions, and attachments

### `apps/mcp-service`

This service runs the Model Context Protocol (MCP) server exposing platform tooling, and drives the OpenAI-powered agent.

Key folders:

- `src/mcp` - SSE server transports and HTTP/gRPC interfaces
- `src/tools` - Tool schemas mapping platform gRPC functions to Zod parameters
- `src/mcp/agent` - Autonomous LLM driver invoking local MCP tools

## Shared libraries

### `libs/common`

Contains reusable NestJS modules, DTOs, guards, filters, and shared types.

This is the shared foundation for validation, exception handling, and cross-service contracts.

### `libs/grpc-clients`

Exposes unified gRPC client drivers (`UserGrpcClient`, `PostGrpcClient`, `MediaGrpcClient`, etc.) mapped to the `@app/clients` import path to prevent code duplication in calling components.

### `libs/kafka`

Provides Kafka configuration and producer utilities used throughout the platform.

It centralizes:

- topic names
- client IDs
- consumer group IDs
- reusable Kafka service wrapper

### `libs/proto-schema`

This library contains the gRPC contract definitions and generated TypeScript bindings.

It is the contract layer between:

- the API gateway and the downstream services
- the domain services that rely on gRPC-based communication

## Storage layer

The repository contains a dedicated `storage/` folder for file-based assets.

The current structure is organized for:

- avatars
- covers
- images
- videos
- temporary uploads

This layer is used by the media service to persist generated variants and original files.

## Infrastructure layer

The Docker Compose files under `docker/compose/*.yml` provision the backing infrastructure, with bootstrap assets in `docker/postgres/` and `docker/mongodb/`:

- PostgreSQL for auth, user, post, and e2ee-chat data
- MongoDB for media metadata, chat logs, and notifications
- Redis instances for gateway caching, presence registers, and session mappings
- Kafka and Kafka UI for asynchronous events

## Why this structure works

The project is organized so that each service owns its own domain responsibilities:

- auth handles identity
- user handles social profiles and follow relations
- media handles assets
- post handles timeline creation
- feed aggregates posts
- chat and e2ee-chat handle real-time and end-to-end encrypted messaging
- mcp hosts AI capabilities
- notification handles messaging and email delivery
- the gateway coordinates the experience

This separation makes the system easier to maintain, test, and extend as new features are introduced.
