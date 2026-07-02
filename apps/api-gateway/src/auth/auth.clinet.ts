/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ChangePasswordDto } from '@app/common';
import {
  Injectable,
  OnModuleInit,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { UserClient } from '../user/user.client';
import { AuthServiceClient } from '@app/proto-schema/protos-types/auth';

@Injectable()
export class AuthClient implements OnModuleInit {
  constructor(private readonly userClient: UserClient) {}

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/auth.proto'),
      url: process.env.AUTH_SERVICE_GRPC_URL || 'localhost:3001',
    },
  })
  private client: ClientGrpc;
  private authService: AuthServiceClient;

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message: err?.details ?? err?.message ?? 'Something went wrong',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async register(data: any) {
    try {
      return await firstValueFrom(this.authService.register(data));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async verifyRegistration(data: any) {
    try {
      return await firstValueFrom(this.authService.verifyRegistration(data));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async forgotPasswordRequest(data: any) {
    try {
      return await firstValueFrom(this.authService.forgotPasswordRequest(data));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async resetPassword(data: any) {
    try {
      return await firstValueFrom(this.authService.resetPassword(data));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async changePassword(userId: any, dto: ChangePasswordDto) {
    try {
      return await firstValueFrom(
        this.authService.changePassword({
          userId: userId,
          oldPassword: dto.oldPassword,
          newPassword: dto.newPassword,
        }),
      );
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async login(data: any) {
    try {
      return await firstValueFrom(this.authService.login(data));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async logout(userId: any) {
    try {
      return await firstValueFrom(
        this.authService.logout({
          userId: userId,
        }),
      );
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async verifyToken(token: string) {
    try {
      return await firstValueFrom(this.authService.verifyToken({ token }));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      return await firstValueFrom(
        this.authService.refreshToken({ refreshToken }),
      );
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async getUserById(userId: any) {
    try {
      return await firstValueFrom(this.authService.getUserById({ userId }));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async getMe(userId: string) {
    try {
      const authUser = await this.getUserById(userId);
      const profile = await this.userClient.getProfile(userId, userId);

      return {
        ...(authUser as any),
        profile,
      };
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await firstValueFrom(this.authService.getUserByEmail({ email }));
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async getAllUsers(page: number, limit: number) {
    try {
      return await firstValueFrom(
        this.authService.getAllUsers({
          page: page,
          limit: limit,
        }),
      );
    } catch (err: any) {
      this.handleError(err);
    }
  }
}
