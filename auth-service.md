# Auth Service

The auth service is the identity and access-control backbone of this platform. It handles user registration, email verification, login, token issuance, password reset, token refresh, logout, and user lookups.

It is implemented as a NestJS gRPC service and is consumed by the API gateway. Internally, it uses PostgreSQL for durable user storage and Redis for OTPs, refresh tokens, login throttling, and caching.

## What this service does

The auth service is responsible for:

- Creating and updating auth users
- Verifying email addresses with one-time passwords
- Issuing access and refresh JWT tokens
- Storing and validating refresh tokens
- Managing password reset flows
- Logging out users and blacklisting tokens
- Serving user lookup operations to other services

## Main responsibilities

### 1. Registration and verification

When a user registers:

1. The gateway receives the request.
2. The gateway forwards it to the auth service over gRPC.
3. The auth service checks whether the email already exists.
4. It hashes the password and creates or updates the auth record.
5. It generates an OTP and stores it in Redis.
6. It publishes Kafka events so the user-service can create a profile and the notification service can send the OTP email.

### 2. Login and session control

The login flow:

- validates the email and password
- enforces login attempt throttling from Redis
- generates access and refresh tokens with JWT
- stores the refresh token in Redis and persists a hashed version in PostgreSQL
- emits a Kafka login event

### 3. Password recovery

The service supports:

- forgot password requests
- password reset using OTP verification
- password changes for authenticated users

## Service communication

### Incoming

The auth service listens for gRPC requests from the API gateway through the `AuthService` proto contract.

### Outgoing

The auth service communicates with:

- PostgreSQL via Prisma
- Redis for temporary state and caching
- Kafka for asynchronous events
- The user-service indirectly, through Kafka-based profile creation
- The notification service through Kafka events

## Database design

The auth service uses a PostgreSQL database with a single primary model:

### `users`

| Column            | Type       | Purpose                      |
| ----------------- | ---------- | ---------------------------- |
| `id`              | `String`   | UUID-based primary key       |
| `name`            | `String`   | User display name            |
| `email`           | `String`   | Unique email address         |
| `password`        | `String`   | Hashed password              |
| `role`            | `enum`     | `USER`, `ADMIN`, `MODERATOR` |
| `isVerified`      | `Boolean`  | Legacy verification flag     |
| `refreshToken`    | `String?`  | Hashed refresh token         |
| `isEmailVerified` | `Boolean`  | Main email verification flag |
| `createdAt`       | `DateTime` | Creation timestamp           |
| `updatedAt`       | `DateTime` | Update timestamp             |

### Notes

- Email is unique and indexed.
- The service currently uses `isEmailVerified` for the verification flow.
- The password is stored as a bcrypt hash.

## Redis usage

Redis is used for fast, short-lived state:

- OTP storage for registration and password reset
- login attempt counting and throttling
- refresh token lookup
- token blacklisting support
- general application cache for user lookups

## Kafka events

The auth service publishes the following events:

- `user.registered` – triggers profile creation in the user-service
- `user.send-registration-otp` – triggers email delivery in the notification service
- `user.login` – signals successful authentication
- `user.forgot-pass-request` – triggers password reset email delivery

## Runtime ports

- gRPC: `3001`
- HTTP: `4001`

## Environment variables

Key variables used by the service include:

- `AUTH_GRPC_PORT`
- `AUTH_HTTP_PORT`
- `AUTH_DB_PRIMARY_URL`
- `AUTH_REDIS_HOST`
- `AUTH_REDIS_PORT`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_EXPIRES`
- `HASH_SOLT`
- `MAX_LOGIN_ATTEMPTS`
- `KAFKA_BROKERS`

## Key folders

- `apps/auth-service/src/auth` – controller, service, and auth flow logic
- `apps/auth-service/src/token` – JWT generation and validation
- `apps/auth-service/src/redis` – Redis integration
- `apps/auth-service/src/prisma` – Prisma client wrapper
- `apps/auth-service/prisma` – Prisma schema and migrations

## Design summary

The auth service is intentionally split into clear concerns:

- auth logic in the service layer
- token handling in the token module
- persistence in Prisma
- short-lived state in Redis
- asynchronous side effects in Kafka

That separation keeps the service reliable, testable, and easy to extend as the platform grows.
