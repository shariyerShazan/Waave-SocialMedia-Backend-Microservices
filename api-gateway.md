# API Gateway

The API gateway is the public entry point of the platform. It exposes the external REST API and coordinates communication with the downstream services so clients do not need to know about the internal service topology.

## What this service does

The gateway is responsible for:

- exposing HTTP endpoints for clients
- validating incoming request payloads
- routing requests to the correct backend service
- handling authentication-related flows through the auth service
- forwarding profile and follow requests to the user service
- forwarding media operations to the media service
- applying rate limiting and request protection

## Service architecture

The gateway is built as a NestJS application and uses gRPC clients to communicate with the internal services.

### Internal connections

- Auth service over gRPC
- User service over gRPC
- Media service over gRPC
- Redis for request rate limiting

### External interface

- REST endpoints for clients
- Swagger documentation at `/docs`

## Main responsibilities

### 1. Request routing

The gateway accepts incoming requests from clients and forwards them to the proper service.

Examples:

- auth endpoints are sent to the auth service
- profile and follow endpoints are sent to the user service
- media operations are sent to the media service

### 2. Authentication orchestration

The gateway exposes login, registration, refresh, logout, password reset, and user lookup endpoints. It delegates the real work to the auth service while keeping the client-facing API simple.

### 3. Rate limiting

The gateway uses Redis-backed rate limiting to protect the platform from abuse and repeated traffic spikes.

## Database design

The API gateway does not own a primary database.

Instead, it relies on downstream services for persistence:

- auth data is stored in the auth service database
- profile data is stored in the user service database
- media metadata is stored in the media service database

## Communication model

### Incoming

- REST API from clients

### Outgoing

- gRPC to auth, user, and media services
- Redis for rate limiting

## Runtime ports

- HTTP: `4000`

## Environment variables

Key variables used by the gateway include:

- `API_GATEWAY_HTTP_PORT`
- `AUTH_SERVICE_GRPC_URL`
- `USER_SERVICE_GRPC_URL`
- `MEDIA_SERVICE_GRPC_URL`
- `API_GATEWAY_REDIS_HOST`
- `API_GATEWAY_REDIS_PORT`
- `JWT_ACCESS_SECRET`

## Key folders

- `apps/api-gateway/src/auth` – authentication endpoints and auth client
- `apps/api-gateway/src/user` – user-related gateway controller and client
- `apps/api-gateway/src/media` – media gateway endpoints and media client
- `apps/api-gateway/src/rateLimit` – guard and decorator-based rate limiting

## Design summary

The API gateway is intentionally thin and orchestration-focused. It does not carry domain logic itself; instead, it exposes a stable public interface and delegates business responsibilities to the specialized services behind it.
