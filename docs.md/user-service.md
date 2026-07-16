# User Service

The User Service manages the social and profile layer of the platform. It owns profile information, follow relationships, user search, suggestions, and online presence.

## What this service does

The service is responsible for:

- Creating and updating user profiles
- Managing follow and unfollow actions
- Returning follower and following lists
- Supporting profile search and suggestions
- Tracking online and offline presence
- Enriching profiles with media references directly in the service, returning nested structures instead of flat strings

## Service architecture

The user service is implemented as a NestJS gRPC service with Kafka and Redis integration.

### Internal connections

- PostgreSQL via Prisma for profile and follow persistence
- Redis for profile caching and presence state
- Kafka for events such as profile updates and follow events
- Media service over gRPC (using `MediaGrpcClient`) for profile media enrichment

## Main responsibilities

### 1. Profile Management & Nested Enrichment

The service stores profile data flat in PostgreSQL. However, before returning profiles to the consumer, the `UserEnrichmentService` resolves `avatarMediaId` and `coverMediaId` to fetch fully resolved metadata from the Media Service.

Returned objects use:
- `avatar`: `UserMedia` (nested object containing `id`, `url`, `mimeType`, `type`)
- `coverImg`: `UserMedia` (nested object containing `id`, `url`, `mimeType`, `type`)

### 2. Follow System

The follow system supports:
- Follow
- Unfollow
- Follower listing
- Following listing
- Follow-state checks

### 3. Search and Recommendations

The service can search users by name or email and provide suggestion results based on existing social connections.

### 4. Presence Tracking

Presence state is stored in Redis so the platform can quickly answer whether a user is online and when they were last seen.

---

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

---

## Runtime ports

- gRPC: `3002`
- HTTP: `4002`

## Key folders

- `apps/user-service/src/user` – service logic and gRPC controller
- `apps/user-service/src/user/enrichments` – profile media enrichment folder (`enrichment.service.ts`)
- `apps/user-service/src/prisma` – Prisma service for PostgreSQL access
- `apps/user-service/src/redis` – Redis integration
- `apps/user-service/prisma` – schema and migrations
