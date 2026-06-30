/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { MediaServiceClient } from '@app/proto-schema/protos-types/media';
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

  async createMedia(data: any) {
    try {
      return await firstValueFrom(this.mediaService.createMedia(data));
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

  async listUserMedia(userId: string, type: any, page: number, limit: number) {
    try {
      return await firstValueFrom(
        this.mediaService.listUserMedia({
          userId,
          type,
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
      return await firstValueFrom(this.mediaService.updateMediaStatus(data));
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
