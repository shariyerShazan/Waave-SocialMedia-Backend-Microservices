# My Product

My Product is a NestJS-based microservices platform designed around authentication, user profiles, media management, and notification workflows. The project is organized as a monorepo with a public API gateway and multiple backend services that communicate over gRPC and Kafka.

## What this project includes

This repository currently implements:

- a REST-based API gateway
- an authentication service with JWT-based access and refresh tokens
- a user/profile service with follow relationships and presence support
- a media service for media metadata, storage integration, and media lookup
- a notification service for email-driven workflows
- Redis-backed caching, throttling, and session support
- PostgreSQL and MongoDB data stores
- Kafka-based event-driven communication

## Architecture overview

The platform is structured in layers:

- API Gateway: the public entry point for clients
- Domain services: auth, user, media, and notification
- Shared libraries: common utilities, Kafka helpers, and proto contracts
- Infrastructure: PostgreSQL, MongoDB, Redis, and Kafka

A typical request flows like this:

1. The client calls the API gateway.
2. The gateway routes the request to the relevant service over gRPC.
3. The service performs the business logic and interacts with its data store.
4. If needed, the service emits Kafka events for asynchronous processing.

## Core services

| Service              | Purpose                                             | Main storage            |
| -------------------- | --------------------------------------------------- | ----------------------- |
| API Gateway          | Public REST API and request routing                 | Redis for rate limiting |
| Auth Service         | Registration, login, token handling, password reset | PostgreSQL              |
| User Service         | Profiles, follows, search, presence                 | PostgreSQL              |
| Media Service        | Media metadata and media lifecycle                  | MongoDB + local storage |
| Notification Service | Email notifications triggered by events             | N/A (event consumer)    |

## Communication model

The system uses a mix of communication patterns:

- gRPC for synchronous service-to-service calls
- Kafka for event-driven workflows
- Redis for cache and short-lived state
- REST for client-facing API endpoints

## Main technologies

- NestJS
- TypeScript
- gRPC
- KafkaJS
- Prisma
- Mongoose
- Redis
- PostgreSQL
- MongoDB
- Swagger

## Repository structure

```text
apps/
  api-gateway/
  auth-service/
  user-service/
  media-service/
  notification/
libs/
  common/
  kafka/
  proto-schema/
storage/
docker-compose.yaml
```

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure services

```bash
docker compose up -d
```

This starts PostgreSQL, MongoDB, Redis, Kafka, and Kafka UI.

### 3. Run Prisma migrations

```bash
npm run auth:prisma:migrate
npm run user:prisma:migrate
```

### 4. Start the applications

You can run the services individually with Nest CLI, for example:

```bash
npx nest start api-gateway --watch
npx nest start auth-service --watch
npx nest start user-service --watch
npx nest start media-service --watch
npx nest start notification --watch
```

## Documentation

For deeper implementation details, see:

- `auth-service.md`
- `api-gateway.md`
- `user-service.md`
- `media-service.md`
- `notification.md`
- `all-services.md`
- `project-structure.md`

## Notes on data design

The system deliberately separates domain data:

- auth and profile data live in PostgreSQL
- media metadata lives in MongoDB
- temporary or high-frequency state lives in Redis
- asynchronous workflows are handled through Kafka

That split keeps the platform flexible while keeping each service focused on its own responsibilities.
