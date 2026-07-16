import { PostServiceClient } from '@app/proto-schema/protos-types/post';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc, Client } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PostGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'post',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/post.proto'),
      url: process.env.POST_SERVICE_GRPC_URL || 'localhost:3003',
    },
  })
  private client: ClientGrpc;
  private postService: PostServiceClient;

  onModuleInit() {
    this.postService = this.client.getService('PostService');
  }

  async getPostsByIds(postIds: string[], requesterId: string) {
    return firstValueFrom(
      this.postService.getPostsByIds({ postIds, requesterId }),
    );
  }

  //   async getTrending(limit: number) {
  //     return [];
  //   }
}
