# Project Structure

This repository is a NestJS monorepo for a multi-service product platform. It is organized around clear application boundaries so each domain can evolve independently while still participating in the larger system.

## High-level layout

```text
my-product/
├── apps/                  # Independent NestJS applications
├── libs/                  # Shared libraries and generated proto types
├── storage/               # Local storage for uploaded media assets
├── docker-compose.yaml    # Infrastructure for databases, Redis, and Kafka
├── package.json           # Workspace scripts and dependencies
└── README.md              # Project overview
```

## Applications

### `apps/api-gateway`

This is the entry point for clients.

It exposes REST endpoints and acts as the orchestrator for downstream services.

Responsibilities:

- HTTP API surface
- Swagger documentation
- Authentication and user routes
- gRPC client integration for auth, user, and media services
- Rate limiting and gateway-level protections

Key folders:

- `src/auth` – authentication endpoints and gRPC client integration
- `src/user` – user-facing gateway endpoints
- `src/media` – media gateway endpoints
- `src/rateLimit` – rate limiting middleware and guard logic

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

### `apps/notification`

This service is responsible for outbound notifications.

Key folders:

- `src/email` – email delivery implementation
- `src/notification` – Kafka consumer handlers

## Shared libraries

### `libs/common`

Contains reusable NestJS modules, DTOs, guards, filters, and shared types.

This is the shared foundation for validation, exception handling, and cross-service contracts.

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

The root `docker-compose.yaml` provisions the backing infrastructure:

- PostgreSQL for auth and user data
- MongoDB for media metadata
- Redis instances for gateway, auth, user, and media services
- Kafka and Kafka UI

## Why this structure works

The project is organized so that each service owns its own domain responsibilities:

- auth handles identity
- user handles social profiles
- media handles assets
- notification handles messaging
- the gateway coordinates the experience

This separation makes the system easier to maintain, test, and extend as new features are introduced.
