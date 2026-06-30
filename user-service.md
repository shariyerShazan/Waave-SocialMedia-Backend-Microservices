# User Service

The user service manages the social and profile layer of the platform. It owns profile information, follow relationships, user search, suggestions, and online presence.

## What this service does

The service is responsible for:

- creating and updating user profiles
- managing follow and unfollow actions
- returning follower and following lists
- supporting profile search and suggestions
- tracking online and offline presence
- enriching profiles with media references

## Service architecture

The user service is implemented as a NestJS gRPC service with Kafka and Redis integration.

### Internal connections

- PostgreSQL via Prisma for profile and follow persistence
- Redis for profile caching and presence state
- Kafka for events such as profile updates and follow events
- Media service over gRPC for profile media enrichment

## Main responsibilities

### 1. Profile management

The service stores profile data for each user and returns a structured profile response to the gateway and other internal consumers.

### 2. Follow system

The follow system supports:

- follow
- unfollow
- follower listing
- following listing
- follow-state checks

### 3. Search and recommendations

The service can search users by name or email and provide suggestion results based on existing social connections.

### 4. Presence tracking

Presence state is stored in Redis so the platform can quickly answer whether a user is online and when they were last seen.

## Database design

The user service uses PostgreSQL with two main models.

### `profiles`

| Column           | Type        | Purpose                                  |
| ---------------- | ----------- | ---------------------------------------- |
| `id`             | `String`    | Profile ID, usually tied to auth user ID |
| `email`          | `String`    | Unique profile email                     |
| `name`           | `String`    | Display name                             |
| `bio`            | `String?`   | Biography                                |
| `avatarMediaId`  | `String?`   | Avatar media reference                   |
| `coverMediaId`   | `String?`   | Cover media reference                    |
| `location`       | `String?`   | Location                                 |
| `website`        | `String?`   | Website                                  |
| `birthDate`      | `DateTime?` | Birth date                               |
| `followersCount` | `Int`       | Number of followers                      |
| `followingCount` | `Int`       | Number of following users                |
| `postsCount`     | `Int`       | Post count placeholder                   |
| `isVerified`     | `Boolean`   | Verification flag                        |
| `createdAt`      | `DateTime`  | Creation timestamp                       |
| `updatedAt`      | `DateTime`  | Update timestamp                         |

### `follows`

| Column        | Type       | Purpose                |
| ------------- | ---------- | ---------------------- |
| `id`          | `String`   | Follow relationship ID |
| `followerId`  | `String`   | User who follows       |
| `followingId` | `String`   | User being followed    |
| `createdAt`   | `DateTime` | Creation timestamp     |

### Notes

- `follows` uses a composite unique constraint on `followerId` and `followingId`.
- Profile updates are cached and invalidated when data changes.

## Redis usage

Redis is used for:

- caching profile responses
- storing online/offline presence state
- keeping follower ID lists for fast access
- caching search results

## Kafka events

The user service emits events such as:

- `user.profile-updated`
- `user.profile-followed`
- `user.profile-unfollowed`

It also consumes the `user.registered` event from the auth flow to create a profile automatically.

## Runtime ports

- gRPC: `3002`
- HTTP: `4002`

## Environment variables

Key variables include:

- `USER_GRPC_PORT`
- `USER_HTTP_PORT`
- `USER_DB_PRIMARY_URL`
- `USER_REDIS_HOST`
- `USER_REDIS_PORT`
- `MEDIA_GRPC_PORT`
- `KAFKA_BROKERS`

## Key folders

- `apps/user-service/src/user` – service logic and gRPC controller
- `apps/user-service/src/prisma` – Prisma service for PostgreSQL access
- `apps/user-service/src/redis` – Redis integration
- `apps/user-service/prisma` – schema and migrations

## Design summary

The user service is the social graph core of the system. It maintains rich profile information, enforces relationships between users, and provides the data needed by other parts of the application.
