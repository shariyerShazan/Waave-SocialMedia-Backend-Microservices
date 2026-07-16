# Post Service

The Post Service manages the creation, persistence, and lifecycle of user posts. It coordinates publishing, scheduled tasks (e.g., digest generation), and emits events for downstream consumers.

## Responsibilities

- Create, update, soft-delete posts and comments
- Publish posts and emit `post.created` / `post.updated` events
- Support scheduled jobs (publish at, reminders, digest generation)
- Provide paginated read endpoints for timelines and user feeds
- Performs self-enrichment of post `author` and post/comment `media` properties via its own `PostEnrichmentService` before returning gRPC payloads to callers

## Architecture

The service is implemented as a NestJS application with Prisma for PostgreSQL data access. It uses Redis for cache and simple rate limiting.

### Communication

- Incoming: gRPC requests from the API gateway for synchronous operations
- Outgoing: Kafka events (`post.created`, `post.published`)
- Internal Service Clients:
  - gRPC client (`UserGrpcClient`) to `user-service` to retrieve author profiles
  - gRPC client (`MediaGrpcClient`) to `media-service` to resolve media URLs

---

## Database design (high level)

- `posts` table: id, authorId, content, mediaRefs, visibility, status, scheduledAt, publishedAt, isDeleted, createdAt, updatedAt
- `post_revisions`: maintains historical versions

---

## Runtime

- gRPC: `3011`
- HTTP: `4011`

---

## Key folders

- `apps/post-service/src/post` — controllers, services, and domain logic
- `apps/post-service/src/post/enrichments` — resolves post/comment author profiles and media URLs (`enrichment.service.ts`)
- `apps/post-service/src/prisma` — Prisma client and schema
- `apps/post-service/src/scheduler` — scheduled-job handlers
