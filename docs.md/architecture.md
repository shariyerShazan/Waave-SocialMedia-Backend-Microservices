```markdown
# Architecture

This document describes the high-level architecture, communication patterns, infrastructure dependencies, and operational considerations for the platform.

## Goals

- Clear separation of concerns: each service owns its data and contracts.
- Reliable inter-service communication with a mix of sync/async patterns.
- Observability and operational primitives: metrics, logs, retries.

## High-level components

- API Gateway: public REST surface, validation, auth, and routing.
- Domain services: `auth-service`, `user-service`, `media-service`, `post-service`, `notification`.
- Shared libs: `libs/common`, `libs/kafka`, `libs/proto-schema` (proto contracts).
- Infrastructure: PostgreSQL, MongoDB, Redis, Kafka.

## Communication patterns

- Client → Gateway: REST/HTTP (JSON)
- Gateway → Services: gRPC (proto contracts in `libs/proto-schema`)
- Domain Events: Kafka topics for asynchronous communication and decoupling
- Short-lived state: Redis used for OTPs, rate limits, presence, and caches

When to use which pattern

- gRPC: synchronous requests that require immediate response (profile lookup, token validation).
- Kafka: domain events and workflows where eventual consistency is acceptable (user registered → profile created; post published → feed updated).

## Data ownership and stores

- Auth & User services: PostgreSQL (structured, relational data and transactions)
- Media service: MongoDB (schema-flexible media metadata and asset references)
- Redis: ephemeral state, rate limiting, presence, and caches

Each service is the only component that writes to its primary store. Read-only access from other services should be done via gRPC or event-derived read models.

## Topics and events (examples)

- `user.registered` — emitted by `auth-service` after registration
- `user.profile-updated` — emitted by `user-service` on profile changes
- `post.created` — emitted by `post-service` when a post is published
- `notification.send` — generic topic for outbound notifications

## Operational considerations

- Idempotency: consumers should handle repeated events safely.
- Schema evolution: use versioned proto contracts and topic compatibility strategies.
- Backpressure & retries: configured at the consumer layer with dead-lettering for failed messages.
- Migrations: each service owns its DB migrations and should run them as part of deployment.

## Runtime ports (convention)

| Service              | HTTP | gRPC |
| -------------------- | ---: | ---: |
| API Gateway          | 4000 |    - |
| Auth Service         | 4001 | 3001 |
| User Service         | 4002 | 3002 |
| Media Service        | 4009 | 3009 |
| Post Service         | 4011 | 3011 |
| Notification Service | 4010 |    - |

Adjust ports via environment variables per-service in production deployments.

## Security and secrets

- Keep secrets in a secure vault (HashiCorp Vault, AWS Secrets Manager, etc.) and inject at runtime.
- Limit database access to the owning service and follow least-privilege principles.
- Use TLS for gRPC in production and secure Kafka connections.

## Observability

- Emit structured logs and request identifiers to trace flows across services.
- Expose Prometheus metrics per-service and aggregate with a metrics backend.
- Configure alerting for consumer lag, error rates, and unhealthy services.

## Evolution guidelines

- Prefer small, focused services. Split only when justified by ownership or operational scaling needs.
- Use event-driven patterns to decouple bounded contexts.
- Keep proto contracts stable and version-aware.
```
