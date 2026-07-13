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
- User Service — profiles, follow relationships, and presence
- Media Service — media metadata, processing, and storage
- Post Service — post creation, publishing, and scheduled tasks
- Notification Service — outbound notification delivery (email, etc.)

Supporting infrastructure includes:

- PostgreSQL for auth and profile data
- MongoDB for media metadata
- Redis for session, cache, and rate-limit state
- Kafka for asynchronous event-driven workflows

## Service relationships

The request flow generally looks like this:

1. A client sends a request to the API gateway.
2. The gateway validates and routes the request.
3. The gateway calls the relevant service over gRPC.
4. The service performs its domain logic and may persist data or interact with Redis.
5. If the operation creates an event of interest, the service publishes a Kafka event.
6. Consumers such as the notification service or user-service handle those events asynchronously.

## 1. API Gateway

The API gateway is the front door of the platform.

### Responsibilities

- Exposes REST endpoints for clients
- Applies validation and Swagger documentation
- Routes authenticated requests to downstream services
- Uses gRPC clients to call auth, user, and media services
- Implements rate limiting with Redis

### Communication

- REST for public clients
- gRPC to `auth`, `user`, and `media` services

### Data layer

The gateway does not own a primary database. It depends on the domain services for persistence.

### Key features

- Swagger at `/docs`
- Auth routes for register, login, refresh, reset-password, and user lookup
- User routes for profile, follow, search, and presence features
- Media routes for upload-related operations

## 2. Auth Service

The auth service owns authentication and token lifecycle.

### Responsibilities

- Registration and email verification
- Login and logout
- JWT access/refresh token issuance
- Password reset and password change
- User lookup by ID or email

### Communication

- gRPC from the gateway
- Kafka to notify downstream services
- Redis for OTP and token state
- PostgreSQL for durable auth data

### Database design

The auth service uses PostgreSQL and stores users in the `users` table.

Key fields:

- `id`
- `name`
- `email`
- `password`
- `role`
- `isEmailVerified`
- `refreshToken`
- `createdAt`
- `updatedAt`

## 3. User Service

The user service manages profile data, follow relationships, and online presence.

### Responsibilities

- Create and update user profiles
- Manage follow/unfollow actions
- Provide follower and following lists
- Support user search and suggestions
- Track online/offline presence
- Hydrate profile media references

### Communication

- gRPC from the gateway through the user service contract
- Kafka consumer for auth events
- gRPC call to the media service for media enrichment
- Redis for profile caching and presence state
- PostgreSQL for profile and follow data

### Database design

The user service uses PostgreSQL with two core models:

#### `profiles`

| Field                     | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `id`                      | Profile identifier, usually the same as the auth user ID |
| `email`                   | Profile email                                            |
| `name`                    | Display name                                             |
| `bio`                     | Short biography                                          |
| `avatarMediaId`           | Media reference for avatar                               |
| `coverMediaId`            | Media reference for cover image                          |
| `location`                | Location text                                            |
| `website`                 | Website URL                                              |
| `birthDate`               | Birth date                                               |
| `followersCount`          | Count of followers                                       |
| `followingCount`          | Count of following users                                 |
| `postsCount`              | Post count placeholder for future expansion              |
| `isVerified`              | Verification state                                       |
| `createdAt` / `updatedAt` | Timestamps                                               |

#### `follows`

| Field         | Purpose                   |
| ------------- | ------------------------- |
| `id`          | Follow relationship ID    |
| `followerId`  | The user who is following |
| `followingId` | The user being followed   |
| `createdAt`   | Timestamp                 |

This table enforces a unique follow relationship and provides the foundation for social graph operations.

## 4. Media Service

The media service handles media metadata and file-related operations.

### Responsibilities

- Store media metadata in MongoDB
- Support media creation and lookup by ID
- Provide media listing for a user
- Track media status such as pending, processing, done, or failed
- Support soft deletion of media records
- Serve media references to the user and profile layers

### Communication

- gRPC from the gateway and user-service
- Redis for media caching
- MongoDB for metadata storage
- Local filesystem storage under `storage/` for actual files

### Database design

The media service uses MongoDB with a `media` collection.

Key fields include:

- `userId`
- `type`
- `originalName`
- `fileName`
- `path`
- `originalUrl`
- `thumbnailUrl`
- `mediumUrl`
- `mimeType`
- `size`
- `status`
- `width`
- `height`
- `duration`
- `isDeleted`
- `deletedAt`
- `createdAt`
- `updatedAt`

The storage layer writes processed files into the `storage/` directory for images, avatars, covers, videos, and temporary files.

## Notification Service

The notification service is an event-driven consumer responsible for outbound communications (email, SMS integrations, etc.). It subscribes to domain events and executes delivery workflows.

### Responsibilities

- Consume Kafka events and map them to notification templates
- Deliver registration OTPs, password resets, and transactional emails
- Implement retry and backoff policies for transient failures

### Communication

- Kafka consumer
- SMTP or external email providers via a pluggable transport layer

### Data layer

The service is mostly stateless and event-driven; persistent storage is optional (for audit or retry tracking) and currently not required.

## Shared infrastructure

### Redis

Redis is used across services for short-lived state:

- Auth: OTPs, refresh tokens, login attempts, cache
- User: profile cache, presence state, follower lists
- Media: media metadata cache
- Gateway: rate limiting

### Kafka

Kafka is used for asynchronous events. The project currently uses topics such as:

- `user.registered`
- `user.send-registration-otp`
- `user.login`
- `user.forgot-pass-request`
- `user.profile-updated`
- `user.profile-followed`
- `user.profile-unfollowed`

### Databases

- Auth and user services: PostgreSQL
- Media service: MongoDB
- Shared state: Redis

## Runtime ports

| Service              | HTTP | gRPC |
| -------------------- | ---: | ---: |
| API Gateway          | 4000 |    - |
| Auth Service         | 4001 | 3001 |
| User Service         | 4002 | 3002 |
| Media Service        | 4009 | 3009 |
| Notification Service | 4010 |    - |

## Development notes

The deployment shape is intentionally modular:

- the gateway is the public interface
- the domain services own their data and logic
- Kafka keeps the system loosely coupled
- Redis provides fast access to frequently changing state

This composition makes the platform easier to evolve, extend, and scale over time.
