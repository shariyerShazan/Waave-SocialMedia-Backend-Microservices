# Media Service

The media service handles all media-related operations for the platform. It manages media metadata, file processing, media status, and media lookup for users and downstream services.

## What this service does

The media service is responsible for:

- creating media records
- uploading and processing images and other media assets
- generating and storing media variants such as thumbnail and medium versions
- tracking media status from pending to done or failed
- listing user media
- soft-deleting media items
- serving media metadata over gRPC

## Service architecture

The service is built with NestJS, Mongoose, Redis, and local file storage.

### Internal connections

- MongoDB for media metadata storage
- Redis for media cache
- Local filesystem storage for actual files
- User service over gRPC for media enrichment
- Gateway over gRPC for media operations

## Main responsibilities

### 1. Media ingestion

The service accepts media input and stores it in the configured storage layer. For images, it processes multiple variants such as original, medium, and thumbnail.

### 2. Media lifecycle

Media items move through a lifecycle that includes:

- pending
- processing
- done
- failed

The service updates this state as processing completes.

### 3. Media lookup

Other services can request media by ID or by a list of IDs. The service returns the relevant media metadata and supports lookups for profile enrichment and client presentation.

## Database design

The media service uses MongoDB with a `media` collection.

### `media`

| Field                     | Type      | Purpose                           |
| ------------------------- | --------- | --------------------------------- |
| `userId`                  | `String`  | Owner of the media                |
| `type`                    | `String`  | Media type such as image or video |
| `originalName`            | `String`  | Original uploaded file name       |
| `fileName`                | `String`  | Stored file name                  |
| `path`                    | `String`  | Relative storage path             |
| `originalUrl`             | `String`  | Original asset URL/path           |
| `thumbnailUrl`            | `String`  | Thumbnail URL/path                |
| `mediumUrl`               | `String`  | Medium-size URL/path              |
| `mimeType`                | `String`  | File MIME type                    |
| `size`                    | `Number`  | File size                         |
| `status`                  | `String`  | Processing state                  |
| `width` / `height`        | `Number`  | Image dimensions                  |
| `duration`                | `Number`  | Optional video/audio duration     |
| `isDeleted`               | `Boolean` | Soft delete flag                  |
| `deletedAt`               | `Date`    | Deletion timestamp                |
| `createdAt` / `updatedAt` | `Date`    | Timestamps                        |

### Notes

- Media records are soft-deleted instead of fully removed.
- The service keeps indexes for user, type, status, and deletion state.

## Storage design

The media service writes files into the `storage/` directory. The current structure includes folders for:

- avatars
- covers
- images
- videos
- temp uploads

## Redis usage

Redis is used to cache media records and speed up subsequent lookups.

## Runtime ports

- gRPC: `3009`
- HTTP: `4009`

## Environment variables

Key variables include:

- `MEDIA_GRPC_PORT`
- `MEDIA_HTTP_PORT`
- `MEDIA_DB_URL_MONGO`
- `MEDIA_REDIS_HOST`
- `MEDIA_REDIS_PORT`

## Key folders

- `apps/media-service/src/media` – media service logic
- `apps/media-service/src/processing` – processing pipeline for images/videos
- `apps/media-service/src/storage` – file storage implementation
- `apps/media-service/src/schemas` – Mongoose schema definitions
- `apps/media-service/src/redis` – Redis integration

## Design summary

The media service separates metadata management from file persistence. It keeps media records in MongoDB, stores physical assets in the local storage layer, and uses Redis to make lookups fast and efficient.
