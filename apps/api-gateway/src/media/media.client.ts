/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  MediaServiceClient,
  MediaType,
  MediaStatus,
} from '@app/proto-schema/protos-types/media';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MediaClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'media',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/media.proto'),
      url: process.env.MEDIA_SERVICE_GRPC_URL || 'localhost:3009',
    },
  })
  private client: ClientGrpc;

  private mediaService: MediaServiceClient;

  onModuleInit() {
    this.mediaService =
      this.client.getService<MediaServiceClient>('MediaService');
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message: err?.details ?? err?.message ?? 'Media Service Error',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private parseMediaType(type?: string): MediaType {
    if (!type || type === 'all') {
      return MediaType.MEDIA_TYPE_UNKNOWN;
    }

    const key = type.toUpperCase() as keyof typeof MediaType;

    if (MediaType[key] !== undefined) {
      return MediaType[key];
    }

    const parsed = Number(type);
    if (!Number.isNaN(parsed) && MediaType[parsed] !== undefined) {
      return parsed;
    }

    return MediaType.MEDIA_TYPE_UNKNOWN;
  }

  private parseMediaStatus(status: string | number | undefined): MediaStatus {
    if (status === undefined || status === null) {
      return MediaStatus.PENDING;
    }

    if (typeof status === 'number') {
      if (MediaStatus[status] !== undefined) {
        return status;
      }
    }

    const key = String(status).toUpperCase() as keyof typeof MediaStatus;
    if (MediaStatus[key] !== undefined) {
      return MediaStatus[key];
    }

    return MediaStatus.PENDING;
  }

  async uploadImage(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    try {
      return await firstValueFrom(
        this.mediaService.uploadImage({
          userId,
          buffer,
          originalName,
          mimeType,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async createMedia(data: any) {
    try {
      return await firstValueFrom(
        this.mediaService.createMedia({
          ...data,
          type: this.parseMediaType(data?.type),
          status: this.parseMediaStatus(data?.status),
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMedia(mediaId: string) {
    try {
      return await firstValueFrom(this.mediaService.getMedia({ mediaId }));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMediaByIds(mediaIds: string[]) {
    try {
      return await firstValueFrom(
        this.mediaService.getMediaByIds({
          mediaIds,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMediaByPath(path: string) {
    try {
      return await firstValueFrom(
        this.mediaService.getMediaByPath({
          path,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async listUserMedia(
    userId: string,
    type: string,
    page: number,
    limit: number,
  ) {
    try {
      return await firstValueFrom(
        this.mediaService.listUserMedia({
          userId,
          type: this.parseMediaType(type),
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteMedia(mediaId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.mediaService.deleteMedia({
          mediaId,
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateMediaStatus(data: any) {
    try {
      return await firstValueFrom(
        this.mediaService.updateMediaStatus({
          ...data,
          status: this.parseMediaStatus(data?.status),
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async exists(mediaId: string) {
    try {
      return await firstValueFrom(
        this.mediaService.exists({
          mediaId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
