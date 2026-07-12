```markdown
# Post Service

The Post Service manages creation, persistence, and lifecycle of user posts. It coordinates publishing, scheduled tasks (e.g., digest generation), and emits events for downstream consumers (feeds, notifications, analytics).

## Responsibilities

- Create, update, soft-delete posts
- Publish posts and emit `post.created` / `post.updated` events
- Support scheduled jobs (publish at, reminders, digest generation)
- Provide paginated read endpoints for timelines and user feeds
- Integrate with media-service for media attachments

## Architecture

The service is implemented as a NestJS application with Prisma for PostgreSQL data access. It uses Redis for cache and simple rate limiting. Scheduled tasks run via a lightweight scheduler (cron or Bull/Redis-backed queue) depending on deployment.

### Communication

- Incoming: gRPC requests from the API gateway for synchronous operations
- Outgoing: Kafka events (`post.created`, `post.published`)
- Media enrichment: gRPC to `media-service` for attached media metadata

## Database design (high level)

- `posts` table: id, authorId, content, mediaRefs, visibility, status, scheduledAt, publishedAt, isDeleted, createdAt, updatedAt
- `post_revisions` (optional): maintains historical versions

## Runtime

- gRPC: `3011`
- HTTP: `4011`

## Environment variables (examples)

- `POST_GRPC_PORT`
- `POST_HTTP_PORT`
- `POST_DB_URL`
- `POST_REDIS_HOST`
- `KAFKA_BROKERS`

## Key folders

- `apps/post-service/src/post` — controllers, services, and domain logic
- `apps/post-service/src/prisma` — Prisma client and schema
- `apps/post-service/src/scheduler` — scheduled-job handlers

## Design notes

- Posts should be immutable once published; updates create revisions when necessary.
- Publish actions must be idempotent and emit single events to avoid duplicate downstream work.
- For scale, consider creating read-optimized projections for feed generation consumed by the gateway.
```
