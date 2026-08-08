# Frontend Notification Integration Guide

This document assists frontend developers in implementing user notifications, checking preferences, and receiving real-time notifications via WebSockets.

---

## 📡 Real-Time WebSockets (Socket.io)

Real-time notifications are delivered over the platform WebSocket connection.

### WebSocket Connection
- **Endpoint**: WebSocket Server URL is managed by the API Gateway gateway router.
- **Event Channel Name**: `notification`

### Real-Time Event Payload Example
```json
{
  "id": "603d29a5-8ec0-449a-bd9b-e7b3a4a7541d",
  "toUserId": "usr-8a2bf610-d09f-43cf-be62-9e9095bb12ab",
  "type": "like",
  "title": "Sarah Connor liked your post",
  "body": "Sarah Connor liked your recent post about Skynet",
  "data": {
    "postId": "post-1cd2eef0"
  },
  "isRead": false,
  "createdAt": "2026-07-17T01:30:15.000Z",
  "sender": {
    "id": "usr-9c98ef20-d09f-44df-be78-0e86a7ff1c0a",
    "username": "sarahconnor",
    "fullName": "Sarah Connor",
    "avatar": "http://localhost:4009/media/uploads/avatars/sarah.jpg",
    "verified": true
  },
  "unreadCount": 3
}
```

---

## 🌐 API Gateway REST Endpoints

All endpoints are prefixed with the API Gateway host: `http://localhost:4000`.

### 1. Retrieve Paginated Notifications
- **Route**: `GET /notifications`
- **Query Params**:
  - `page`: default `1`
  - `limit`: default `20`
- **Response Format (`200 OK`)**:
```json
{
  "notifications": [
    {
      "id": "603d29a5-8ec0-449a-bd9b-e7b3a4a7541d",
      "toUserId": "usr-8a2bf610-d09f-43cf-be62-9e9095bb12ab",
      "type": "comment",
      "title": "New Comment",
      "body": "Sarah Connor commented on your post.",
      "data": {
        "postId": "post-1cd2eef0",
        "commentId": "comment-55a02ef4"
      },
      "isRead": false,
      "createdAt": "2026-07-17T01:30:15.000Z",
      "sender": {
        "id": "usr-9c98ef20-d09f-44df-be78-0e86a7ff1c0a",
        "username": "sarahconnor",
        "fullName": "Sarah Connor",
        "avatar": "http://localhost:4009/media/uploads/avatars/sarah.jpg",
        "verified": true
      }
    }
  ],
  "total": 45,
  "unreadCount": 3,
  "page": 1
}
```

### 2. Mark Notification as Read
- **Route**: `PATCH /notifications/:id/read`
- **Response Format (`200 OK`)**:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 3. Mark All Notifications as Read
- **Route**: `PATCH /notifications/read-all`
- **Response Format (`200 OK`)**:
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 4. Delete Notification
- **Route**: `DELETE /notifications/:id`
- **Response Format (`200 OK`)**:
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### 5. Get Settings/Preferences
- **Route**: `GET /notifications/preferences`
- **Response Format (`200 OK`)**:
```json
{
  "userId": "usr-8a2bf610-d09f-43cf-be62-9e9095bb12ab",
  "likes": true,
  "comments": true,
  "follows": true,
  "unfollows": false,
  "mentions": true,
  "messages": true
}
```

### 6. Update Settings/Preferences
- **Route**: `PATCH /notifications/preferences`
- **Request Body**:
```json
{
  "likes": true,
  "comments": false,
  "follows": true
}
```
- **Response Format (`200 OK`)**:
```json
{
  "userId": "usr-8a2bf610-d09f-43cf-be62-9e9095bb12ab",
  "likes": true,
  "comments": false,
  "follows": true,
  "unfollows": false,
  "mentions": true,
  "messages": true
}
```
