# Feed Service

The Feed Service manages personalized timelines, explore/trending feeds, and Redis-based cache state for the social feed experience. It consumes post and follow events from Kafka, enriches post payloads with user and media metadata, and exposes gRPC endpoints for feed retrieval and invalidation.

## What this service does

- Builds and serves user feeds from Redis-backed timelines
- Supports explore feed and trending post retrieval
- Consumes Kafka events for post creation, deletion, likes, comments, shares, follow, and unfollow
- Enriches feed posts using `user-service` and `media-service`
- Caches feed pages and keeps trending signals updated

## Architecture

- NestJS microservice with gRPC and Kafka transports
- Redis for primary feed storage, page cache, celebrity post buckets, and trending scores
- gRPC client integration to `user-service`, `post-service`, and `media-service`
- HTTP server exposes Swagger docs at `/docs`

### Communication

- Incoming: gRPC requests from the API gateway or internal consumers
- Outgoing:
  - gRPC to `user-service` for follow graph and profile data
  - gRPC to `post-service` for post details
  - gRPC to `media-service` for media enrichment
- Kafka topics consumed:
  - `post.created`
  - `post.deleted`
  - `post.liked`
  - `post.commented`
  - `post.shared`
  - `user.profile-followed`
  - `user.profile-unfollowed`

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

## Environment variables

- `FEED_GRPC_PORT`
- `FEED_HTTP_PORT`
- `FEED_REDIS_HOST`
- `FEED_REDIS_PORT`
- `POST_SERVICE_GRPC_URL`
- `USER_SERVICE_GRPC_URL`
- `MEDIA_SERVICE_GRPC_URL`
- `MEDIA_HTTP_BASE_URL`
- `KAFKA_BROKERS`

## Key folders

- `apps/feed-service/src/feed` — feed business logic, gRPC controller, enrichment service, Kafka consumer
- `apps/feed-service/src/redis` — Redis access layer for feed list management, cache and trending state
- `apps/feed-service/src` — service bootstrap and module wiring

## Design notes

- Feed pages are cached on first page retrieval and invalidated after downstream updates
- Celebrity posts are handled separately to reduce fanout cost for high-follower users
- Trending scores are incrementally updated from post interactions
- Follow/unfollow events trigger feed invalidation for affected users
