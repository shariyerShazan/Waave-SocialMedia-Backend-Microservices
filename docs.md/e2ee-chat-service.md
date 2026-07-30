# End-to-End Encrypted (E2EE) Chat Service

The E2EE Chat Service manages secure communication channels, utilizing end-to-end encryption mechanics (based on the Double Ratchet protocol principles) for direct and group chat applications.

## What this service does

The service is responsible for:
- Initiating and retrieving cryptographically locked direct (1-on-1) conversations using unique sorted peer indices (`directKey`).
- Managing group chat registration, configuration details, and membership updates.
- Storing and distributing encrypted message envelopes designed for client devices.
- Tracking encrypted media attachments associated with payloads.
- Managing message status receipts (Sent, Delivered, Read) and emoji reactions.
- Pervasive inbox status caching, online presence checking, and unread metrics.

## Service architecture

The E2EE Chat Service is a NestJS application built around gRPC interfaces for synchronous gateway routing, PostgreSQL for data durability, and WebSockets (Socket.io) for live socket channels.

### Internal connections

- **PostgreSQL via Prisma**: Persists metadata for conversations, devices, prekey distribution maps, message envelopes, and attachments.
- **Redis Integration**: Manages online subscriber sets, increments unread alerts, and invalidates temporary message caches.
- **gRPC Controller**: Receives operations for creating direct/group conversations, retrieving messaging logs, and managing group configurations.
- **Socket.io Gateway**: Drives real-time delivery of encrypted message payloads and receipts to connected clients.

---

## Main responsibilities

### 1. Conversation Lifecycle & Access Gates
Supports creation and indexing of messaging channels:
- **Direct Mode**: Generates a sorted unique compound index of participant IDs (`userId1:userId2`) to guarantee single-instance integrity.
- **Group Mode**: Tracks admin rosters, pinned messages, avatars, and participants.

### 2. Message Envelope Routing
Stores device-specific ciphertext envelopes rather than plain text. On message submission, the sender generates a unique envelope for every participant device containing the ciphertext, ratcheted parameters, and IV.

### 3. Encrypted Attachments
Maps uploaded files to original storage artifacts inside the Media Service while encapsulating client-encrypted keys.

### 4. Receipts & Reactions
Updates and maps delivered/read timestamps per device, triggering real-time unread badges.

---

## Database design (PostgreSQL Schema)

Operated via PostgreSQL through Prisma using the following entities:

### `conversations`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | **Primary Key** |
| `type` | `ChatType` | ENUM: `DIRECT`, `GROUP` |
| `name` | `String?` | Custom group channel label |
| `avatar` | `String?` | Path to group channel avatar |
| `createdBy` | `String` | Creating user UUID |
| `isDeleted` | `Boolean` | Soft delete flag |
| `lastMessageId` | `String?` | Reference to last E2EE message |
| `lastMessageAt` | `DateTime?` | Timestamp of last message activity |
| `lastSenderId` | `String?` | Last sender user UUID |
| `directKey` | `String?` | Unique sorted compound index for direct chats |

### `conversation_members`

Tracks conversation memberships:
- `unreadCount`: Current unread messages.
- `muted` / `mutedUntil`: Client-controlled volume configurations.
- `archived` / `pinned`: Workspace layout attributes.

### `encrypted_messages`

Tracks encrypted message headers:
- `senderId`, `senderDeviceId`: Identification of sending device.
- `type`: ENUM message categorization (e.g. `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `SENDER_KEY_DISTRIBUTION`).
- `clientMessageId`: Unique client-side generated identifier for idempotency check.

### `message_envelopes`

Contains the client-ratcheted ciphertext payloads:
- `recipientUserId`, `recipientDeviceId`: Identifies the target recipient device.
- `ciphertext`, `iv`, `authTag`: Core cryptograms.
- `ratchetHeader`, `ephemeralKey`, `oneTimePreKeyId`, `signedPreKeyId`: Ephemeral ratchet keys.

### `encrypted_attachments`

Integrates encrypted attachments:
- `mediaId`: Matches asset ID stored in Media Service.
- `encryptedKey`: Hex/Base64 key reference to decrypt the file.

---

## Runtime ports

- gRPC: `3006`
- HTTP: `4006`
- WebSocket Client Path: `localhost:4006/e2ee-chat`

---

## Key folders

- `apps/e2ee-chat-service/src/e2ee-chat` – core gRPC services, HTTP adapters, and WebSockets controllers
- `apps/e2ee-chat-service/src/e2ee-chat/gateway` – Socket.io handlers managing connection streams
- `apps/e2ee-chat-service/src/e2ee-chat/enrichments` – gRPC client wrapper resolving user/media info
- `apps/e2ee-chat-service/prisma` – database models and Prisma clients
- `apps/e2ee-chat-service/src/redis` – cache and unread counter service
