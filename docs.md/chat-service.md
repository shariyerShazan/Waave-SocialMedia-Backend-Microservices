# Chat Service

The Chat Service manages the messaging layer of the platforms, supporting direct messages, group chats, read statuses, message reactions, and WebSocket presence tracking.

## What this service does

The service is responsible for:
- Creating and retrieving direct (1-on-1) conversations
- Creating group chats with custom avatars and admins
- Inviting and adding new members to existing group chats
- Broadcasting real-time messages via the WebSockets gateway
- Persisting message histories and reactions
- Tracking unread counts per user and conversation
- Recalling (deleting) messages in real-time

## Service architecture

The chat service is a NestJS application using gRPC for service-to-service calls, MongoDB for message and conversation archiving, and WebSockets (Socket.io) for live messaging.

### Internal connections
- **MongoDB (Mongoose)**: Persists conversations, messages, reactions, read status indices, and group metadata
- **Redis**: Caches socket sessions, maintains real-time active clients, and handles message queue updates
- **gRPC Controller**: Receives queries for conversation listings, message history, and reactions from the API Gateway

---

## Main responsibilities

### 1. Conversation Lifecycle
Maintains list structures of members, admins, and active participants. Differentiates between:
- `direct`: 1-on-1 private messaging channels
- `group`: Multi-member channels with admin privileges

### 2. Live Message Transmission
Uses Socket.io to establish persistent client-to-server connections, forwarding incoming payloads and media attachments to conversation participants in real-time.

### 3. Read Verification
Maintains a list of readers on each message segment and updates unread counters when items are marked read.

### 4. Emoji Reactions
Enables users to react with inline emojis, mapping multiple user IDs to reaction keys in database records.

---

## Database design

The chat service uses MongoDB with two main collections.

### `conversations`
- `participants`: Array of user UUID strings
- `type`: `direct` | `group`
- `name`: Group conversation name string (empty for direct)
- `avatar`: Folder storage path for group avatars
- `lastMessage`: Text of the last message sent
- `lastMessageAt`: Timestamp of the last activity
- `lastSenderId`: User ID of the last sender
- `unreadCounts`: Key-value map (`userId` &rarr; `unreadCount` integer)
- `admins`: Array of administrator user UUIDs
- `isDeleted`: Boolean flag
- `createdAt` / `updatedAt`

### `messages`
- `conversationId`: Parent conversation reference
- `senderId` / `senderName` / `senderAvatar`: Sender identifiers (mapped to nested `sender` object in responses)
- `text`: Text string of the message content
- `mediaIds`: Array of attached media UUID strings (mapped to nested `media` objects in responses)
- `type`: message format (`text`, `image`, `video`, etc.)
- `readBy`: Array of user IDs that have read the message
- `reactions`: Map of emojis &rarr; array of user UUIDs who reacted
- `isDeleted`: Soft delete flag (used for message recall)
- `replyTo`: Parent message ID if replying
- `createdAt` / `updatedAt`

---

## Runtime ports

- gRPC: `3005`
- HTTP: `4005`

## Key folders

- `apps/chat-service/src/chat` – WebSocket gateways, controllers, and services
- `apps/chat-service/src/schemas` – Mongoose schemas for MongoDB
- `apps/chat-service/src/redis` – Redis caching and socket management
