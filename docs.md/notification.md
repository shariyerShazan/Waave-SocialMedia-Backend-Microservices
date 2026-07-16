# Notification Service

The Notification Service is an email delivery engine, in-app notification tracker, and WebSocket notifier. It listens for Kafka domain events to deliver emails and push live feeds, while exposing a gRPC API to manage notification archives.

## What this service does

- Consumes Kafka events for registration OTPs, password resets, likes, comments, and follows
- Generates outbound transactional emails
- Pushes real-time alerts to clients over WebSockets
- Persists notification history and settings in MongoDB
- Exposes gRPC endpoints to retrieve notification histories and adjust subscription preferences

## Service architecture

The notification service is a NestJS application using Kafka and gRPC.

### Internal connections

- Kafka for event consumption
- SMTP server connection for email delivery
- MongoDB database (via Mongoose) to track historical logs and preference configurations
- Socket.io Server for pushing live notifications to connected clients

---

## Main responsibilities

### 1. In-App Notification Streams & Preferences

Exposes `NotificationGrpcService` to handle:
- **`GetNotifications`**: Returns history containing a nested `sender` object (`User` structure containing `id`, `fullName`, `avatar`, `verified`, etc.)
- **`MarkAsRead`** / **`MarkAllAsRead`** / **`DeleteNotification`**
- **`GetPreferences`** / **`UpdatePreferences`**

### 2. Email Delivery

Dispatches sign-up verification, forgot password requests, and interaction briefs to SMTP ports.

---

## Database design (MongoDB Mongoose)

### `notifications` collection
- `toUserId`: Target user uuid
- `fromUserId` / `fromUserName` / `fromUserAvatar`: Sender properties (mapped to nested `sender` object in gRPC responses)
- `type`: alert trigger category (`like`, `comment`, etc.)
- `title` / `body`: Alert text
- `data`: Query parameters map (`postId`, `commentId`, etc.)
- `isRead`: Boolean read flag
- `createdAt` / `updatedAt`

### `notification_preferences` collection
- `userId`: Target user uuid
- `likes` / `comments` / `follows` / `unfollows` / `mentions` / `messages`: Boolean permission flags

---

## Runtime ports

- gRPC: `3007`
- HTTP: `4010`

---

## Key folders

- `apps/notification/src/email` – email delivery logic
- `apps/notification/src/notification` – Kafka consumer and gRPC controller mappings
- `apps/notification/src/schemas` – MongoDB database models
