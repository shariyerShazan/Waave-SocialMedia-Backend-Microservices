# Waave

This repository implements a production-minded NestJS microservice platform with clear domain boundaries and operational guidance. It is organized as a monorepo containing an API gateway and several domain services; services communicate using gRPC for synchronous calls and Kafka for asynchronous events. Redis is used for short-lived state and caching.

Quick links

- Documentation: [docs.md/all-services.md](docs.md/all-services.md)
- Architecture: [docs.md/architecture.md](docs.md/architecture.md)
- Project structure: [docs.md/project-structure.md](docs.md/project-structure.md)

Core services

- API Gateway — public REST surface, routing and orchestration
- Auth Service — identity, credentials, token lifecycle
- User Service — profiles, follow graph, presence
- Media Service — media metadata and processing
- Post Service — post lifecycle, scheduling, feed generation
- Notification Service — event-driven outbound notifications

Primary technologies

- NestJS, TypeScript, Prisma, Mongoose
- gRPC (proto contracts in libs/proto-schema) and Kafka (event bus)
- PostgreSQL, MongoDB, Redis
- Docker Compose for local infra

Getting started (local development)

1. Install dependencies

```bash
npm install
```

2. Start local infrastructure

```bash
docker compose up -d
```

3. Apply database migrations (service-specific)

```bash
npm run auth:prisma:migrate
npm run user:prisma:migrate
npm run post:prisma:migrate
```

4. Run services (examples)

```bash
npx nest start api-gateway --watch
npx nest start auth-service --watch
npx nest start user-service --watch
npx nest start media-service --watch
npx nest start post-service --watch
npx nest start notification --watch
```

Operational notes

- The gateway should remain thin: validate, authenticate, and delegate.
- Domain services own their data, migrations, and contracts.
- Prefer events (Kafka) over cross-service direct DB access.

See docs.md for per-service design notes, runtime ports, and environment variables.
