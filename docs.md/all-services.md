# All Services Overview

This project is built as a NestJS monorepo with multiple services that work together through gRPC, Kafka, Redis, and PostgreSQL/MongoDB. The design follows a service-oriented approach where the API gateway exposes a unified public interface while domain-specific services handle their own data and responsibilities.

## Service documentation

Each service has a dedicated markdown guide. New services are added as the codebase evolves.

- [API Gateway](./api-gateway.md)
- [Auth Service](./auth-service.md)
- [User Service](./user-service.md)
- [Media Service](./media-service.md)
- [Post Service](./post-service.md)
- [Feed Service](./feed-service.md)
- [Notification Service](./notification.md)

## Architecture at a glance

The system consists of several domain services and an orchestrating gateway. Primary runtime pieces include:

- API Gateway — public entry point and orchestration layer
- Auth Service — identity, token lifecycle, and verification flows
- User Service — profiles, follow relationships, media enrichment, and presence
- Media Service — media metadata, processing, and storage
- Post Service — post creation, publishing, media/author enrichment, and scheduled tasks
- Feed Service — timeline aggregation, trending scoring, and cache invalidation
- Chat Service — real-time messages, group chats, and socket management
- Notification Service — outbound notifications (email, etc.) and in-app alerts repository

Supporting infrastructure includes:

- PostgreSQL for auth, profile, and post data
- MongoDB for media metadata, chat messages/conversations, and notifications
- Redis for session, cache, and rate-limit state
- Kafka for asynchronous event-driven workflows

## Service relationships

The request flow generally looks like this:

1. A client sends a request to the API gateway.
2. The gateway validates and routes the request.
3. The gateway calls the relevant service over gRPC.
4. The service performs its domain logic and may persist data or interact with Redis.
5. Services resolve their dependencies (such as profile media or post Author metadata) at the source service layer using gRPC clients prior to returning.
6. If the operation creates an event of interest, the service publishes a Kafka event.
7. Consumers such as the notification service or feed-service handle those events asynchronously.

---

## 1. API Gateway

The API gateway is the front door of the platform, functioning as a pass-through orchestration layer.

### Responsibilities

- Exposes REST endpoints for clients
- Applies validation and Swagger documentation
- Routes authenticated requests to downstream services via gRPC
- Implements rate limiting with Redis

### Communication

- REST for public clients
- gRPC to downstream services (`auth`, `user`, `media`, `post`, `feed`, `chat`, `notification`)

---

## 2. Auth Service

The auth service owns authentication and token lifecycle.

### Database design

Conducted on PostgreSQL: stores users in the `users` table.

---

## 3. User Service

The user service manages profile data, follow relationships, and online presence.

### Responsibilities

- Create and update user profiles
- Manage follow/unfollow actions
- Provide follower and following lists
- Support user search and suggestions
- Track online/offline presence
- Hydrates profile media details (`avatar`, `coverImg`) directly as nested `UserMedia` structures via its own `UserEnrichmentService` calling `MediaGrpcClient`

### Communication

- gRPC from the gateway
- Kafka consumer for auth events
- gRPC call to the media service for media resolution
- PostgreSQL for profile and follow data

---

## 4. Media Service

The media service handles media metadata and file-related operations.

### Responsibilities

- Store media metadata in MongoDB
- Serve media references to the user, post, feed, chat, and notification layers
- Resize raw images into thumbnail and medium dimensions

---

## 5. Post Service

The post service manages user posts, comments, likes, and bookmarks.

### Responsibilities

- Create, update, soft-delete posts and comments
- Enriches post `author` and post/comment `media` automatically at the service layer via `PostEnrichmentService` before returning to the gateway
- Publishes events key to feed timelines

---

## 6. Feed Service

Timeline aggregation service built entirely stateless over Redis caches.

### Responsibilities

- Serves timelines using nested `author` (User) and `media` (repeated Media) objects pre-resolved and fetched from `post-service`

---

## 7. Chat Service

Bi-directional chat system handling private and group conversations.

### Responsibilities

- Exposes REST and WebSocket endpoints for conversation mapping
- Maps database documents back to nested `sender` (User) and `media` (repeated Media) objects

---

## 8. Notification Service

Outbound transactional email courier and in-app alerts repository.

### Responsibilities

- Emits real-time alerts to active users via WebSockets
- Persists notification history and settings in MongoDB
- Returns nested `sender` (User) profiles with alerts list

---

## Runtime ports

| Service | HTTP | gRPC | Database |
| :--- | :---: | :---: | :--- |
| **API Gateway** | 4000 | - | None |
| **Auth Service** | 4001 | 3001 | PostgreSQL |
| **User Service** | 4002 | 3002 | PostgreSQL |
| **Media Service** | 4009 | 3009 | MongoDB |
| **Feed Service** | 4004 | 3004 | None (Redis Cache) |
| **Post Service** | 4011 | 3011 | PostgreSQL |
| **Chat Service** | 4005 | 3005 | MongoDB |
| **Notification** | 4010 | 3007 | MongoDB |
