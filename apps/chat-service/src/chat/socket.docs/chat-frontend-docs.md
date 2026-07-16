# Chat & Real-Time Messaging Integration Guide

This guide describes how to connect to the Chat server, listen to message events, and consume REST endpoints in `chat-service`.

---

## 📡 WebSockets (Socket.io) Real-Time Layer

The Chat Gateway handles message exchanges in real-time.

### WebSocket Connection
- **Endpoint**: WebSocket Server URL. Handled by API Gateway gateway router or separate server load balancer.
- **Connection Handshake Configuration**:
  Pass authorization attributes in metadata handshake authentication:
  ```json
  {
    "auth": {
      "token": "BEARER_JWT_ACCESS_TOKEN",
      "avatar": "http://localhost:4009/...current-user-avatar.png",
      "userName": "UserName"
    }
  }
  ```

### WebSocket Events

#### 1. Inbound Event: `message` (Listen for incoming messages)
- **Payload Signature Example**:
```json
{
  "id": "msg-8f2c3d0b",
  "conversationId": "conv-5f80b2d4",
  "text": "Hey there! How is the project going?",
  "type": "text",
  "readBy": ["usr-current-user-id"],
  "reactions": {
    "👍": {
      "values": ["usr-another-user-id"]
    }
  },
  "isDeleted": false,
  "replyTo": "msg-7d1a2b3c",
  "createdAt": 1781658429000,
  "updatedAt": 1781658430000,
  "sender": {
    "id": "usr-sender-uuid",
    "username": "sarahconnor",
    "fullName": "Sarah Connor",
    "avatar": "http://localhost:4009/media/uploads/avatars/sarah.jpg",
    "verified": true
  },
  "media": [
    {
      "id": "med-3ff02da4",
      "url": "http://localhost:4009/media/uploads/images/diagram.png",
      "mimeType": "image/png",
      "type": "IMAGE"
    }
  ]
}
```

#### 2. Outbound Event: `sendMessage` (Emit to send a message)
- **Emit Signature**:
```javascript
socket.emit('sendMessage', {
  conversationId: "conv-5f80b2d4",
  text: "Hello team!",
  type: "text",
  mediaIds: ["med-3ff02da4"], // optional media attachments
  replyTo: "msg-7d1a2b3c"      // optional message ID to reply to
});
```

---

## 🌐 API Gateway REST Endpoints

All endpoints are prefixed with the API Gateway host: `http://localhost:4000`.

### 1. Close/Retrieve Conversation List
- **Route**: `GET /conversations`
- **Query Params**:
  - `page`: default `1`
  - `limit`: default `10`
- **Response Format (`200 OK`)**:
```json
{
  "conversations": [
    {
      "id": "conv-5f80b2d4",
      "type": "group",
      "name": "Project Alpha Group",
      "avatar": "http://localhost:4009/media/uploads/groups/alpha.jpg",
      "participants": ["usr-user1", "usr-user2", "usr-user3"],
      "lastMessage": "Hello team!",
      "lastMessageAt": 1781658429000,
      "lastSenderId": "usr-sender-uuid",
      "unreadCount": 2,
      "isOnline": true
    }
  ],
  "total": 1,
  "page": 1
}
```

### 2. Get/Create Direct Conversation
- **Route**: `POST /conversations`
- **Request Body**:
```json
{
  "userId": "usr-target-user-uuid"
}
```
- **Response Format (`201 Created`)**:
```json
{
  "conversation": {
    "id": "conv-8889a7bd",
    "participants": ["usr-sender-uuid", "usr-target-user-uuid"],
    "type": "direct",
    "name": "",
    "avatar": "",
    "lastMessage": "",
    "unreadCounts": {},
    "admins": [],
    "isDeleted": false,
    "createdAt": 1781658400000,
    "updatedAt": 1781658400000
  }
}
```

### 3. Create Group Conversation
- **Route**: `POST /conversations/group`
- **Request Body**:
```json
{
  "name": "Design Team",
  "participantIds": ["usr-user1", "usr-user2"],
  "avatar": "http://localhost:4009/media/group-avatar.png"
}
```
- **Response Format (`201 Created`)**: Same as Conversation payload structure.

### 4. Add Group Member
- **Route**: `POST /conversations/:id/members`
- **Request Body**:
```json
{
  "userId": "usr-user-to-add-uuid"
}
```
- **Response Format (`200 OK`)**:
```json
{
  "success": true,
  "message": "Member added successfully"
}
```

### 5. Get Messages History
- **Route**: `GET /conversations/:id/messages`
- **Query Params**:
  - `page`: default `1`
  - `limit`: default `20`
- **Response Format (`200 OK`)**:
```json
{
  "messages": [
    {
      "id": "msg-8f2c3d0b",
      "conversationId": "conv-5f80b2d4",
      "text": "What do you think is next?",
      "type": "text",
      "createdAt": 1781658429000
      // ... full message payload with sender & media
    }
  ],
  "total": 150,
  "page": 1
}
```

### 6. React to Message
- **Route**: `POST /messages/:id/react`
- **Request Body**:
```json
{
  "emoji": "🔥"
}
```
- **Response Format (`201 Created`)**: Same as Message payload structure with updated reactions.

### 7. Recall or Delete Message
- **Route**: `DELETE /messages/:id`
- **Response Format (`200 OK`)**:
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```
