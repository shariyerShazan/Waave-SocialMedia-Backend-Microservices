/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UserServiceClient } from '@app/proto-schema/protos-types/user';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc, Client } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/user.proto'),
      url: process.env.USER_SERVICE_GRPC_URL || 'localhost:3002',
    },
  })
  private client: ClientGrpc;
  private userService: UserServiceClient;

  onModuleInit() {
    this.userService = this.client.getService('UserService');
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const result = await firstValueFrom(
      this.userService.getFollowerIds({ userId }),
    );
    return result.followerIds || [];
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await firstValueFrom(
      this.userService.getFollowing({
        userId,
        page: 1,
        limit: 5000,
      }),
    );
    return result.users?.map((u: any) => u.id) || [];
  }

  async getUsersByIds(userIds: string[]) {
    return firstValueFrom(this.userService.getUsersByIds({ userIds }));
  }
}
