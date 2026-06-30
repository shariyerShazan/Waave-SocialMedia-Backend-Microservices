# Notification Service

The notification service is the platform’s email and messaging event consumer. It listens for domain events and sends outbound notifications when something important happens.

## What this service does

The service is responsible for:

- consuming Kafka events
- sending registration OTP emails
- sending password reset OTP emails
- handling notification workflows asynchronously

## Service architecture

The notification service is a NestJS Kafka consumer. It does not expose a heavy REST surface; instead, it reacts to events emitted by other services.

### Internal connections

- Kafka for event consumption
- Email transport layer for outbound mail delivery

## Main responsibilities

### 1. Event-driven notifications

The service subscribes to topics emitted by the auth service and other domain services. When an event arrives, it prepares and sends the relevant notification.

### 2. Email delivery

The current implementation focuses on email notifications for OTP flows such as:

- registration verification
- password reset requests

## Database design

The notification service does not own a primary business database.

It is designed to be stateless and event-driven, meaning it reacts to incoming messages instead of persisting application data itself.

## Kafka topics

The notification service consumes topics such as:

- `user.send-registration-otp`
- `user.forgot-pass-request`

## Runtime ports

- HTTP: `4010`

## Environment variables

Key variables include:

- `NOTIFICATION_HTTP_PORT`
- `KAFKA_BROKERS`

## Key folders

- `apps/notification/src/email` – email delivery logic
- `apps/notification/src/notification` – Kafka consumer handlers

## Design summary

The notification service stays lightweight and focused on message-driven communication. It keeps the platform decoupled by reacting to business events instead of being tightly coupled to the request flow of the gateway.
