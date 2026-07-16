import { MediaServiceClient } from '@app/proto-schema/protos-types/media';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MediaGrpcClient implements OnModuleInit {
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

  async getMediaByIds(mediaIds: string[]) {
    return firstValueFrom(this.mediaService.getMediaByIds({ mediaIds }));
  }
}
