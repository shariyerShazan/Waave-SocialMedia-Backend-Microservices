# Feed Service

The Feed Service manages personalized timelines, explore/trending feeds, and Redis-based cache state for the social feed experience. It consumes post and follow events from Kafka and exposes gRPC endpoints for feed retrieval and invalidation.

## What this service does

- Builds and serves user feeds from Redis-backed timelines
- Supports explore list and trending post retrieval
- Consumes Kafka events for post creation, deletion, likes, comments, shares, follow, and unfollow
- Maps pre-resolved posts to nested `author` (User) and `media` (repeated Media) objects directly from `post-service` without doing round-trips to user or media services

## Architecture

- NestJS microservice with gRPC and Kafka transports
- Redis for primary feed storage, page cache, celebrity post buckets, and trending scores
- gRPC client integration to `post-service`
- HTTP server exposes Swagger docs at `/docs`

### Communication

- Incoming: gRPC requests from the API gateway or internal consumers
- Outgoing:
  - gRPC to `post-service` for post details
- Kafka topics consumed:
  - `post.created`
  - `post.deleted`
  - `post.liked`
  - `post.commented`
  - `post.shared`
  - `user.profile-followed`
  - `user.profile-unfollowed`

---

## Data model and caching

The feed service does not own a relational database. It relies on Redis structures for timeline state and personalization.

Key Redis keys:

- `feed:{userId}` — user timeline list
- `feed:page:{userId}:{page}` — cached page results
- `celebrity:posts:{authorId}` — celebrity post buckets
- `trending:posts:global` — sorted set of trending post scores
- `user:followerCount:{userId}` — cached follower count for celebrity detection

## Runtime

- gRPC port: `FEED_GRPC_PORT` (default `3004`)
- HTTP port: `FEED_HTTP_PORT` (default `4004`)
- Proto contract: `libs/proto-schema/src/proto/feed.proto`

---

## Key folders

- `apps/feed-service/src/feed` — feed business logic, gRPC controller, enrichment service, Kafka consumer
- `apps/feed-service/src/feed/enrichments` — map raw post payloads to nested proto models (`enrichment.service.ts`)
- `apps/feed-service/src/redis` — Redis access layer for feed list management, cache and trending state
