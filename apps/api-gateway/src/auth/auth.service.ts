/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  OnModuleInit,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

interface AuthGrpcService {
  register(data: any): any;
  login(data: any): any;
  logout(data: any): any;
  verifyToken(data: any): any;
  refreshToken(data: any): any;
}

@Injectable()
export class AuthService implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/auth.proto'),
      url: process.env.AUTH_SERVICE_URL || 'localhost:3001',
    },
  })
  private client: ClientGrpc;
  private authService: AuthGrpcService;

  onModuleInit() {
    this.authService = this.client.getService<AuthGrpcService>('AuthService');
  }

  async register(data: any) {
    try {
      return await firstValueFrom(this.authService.register(data));
    } catch (err: any) {
      const message = err?.message ?? err?.details ?? JSON.stringify(err);
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }

  async login(data: any) {
    try {
      return await firstValueFrom(this.authService.login(data));
    } catch (err: any) {
      const message = err?.message ?? err?.details ?? JSON.stringify(err);
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }

  async logout(data: any) {
    try {
      return await firstValueFrom(this.authService.logout(data));
    } catch (err: any) {
      const message = err?.message ?? err?.details ?? JSON.stringify(err);
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }

  async verifyToken(token: string) {
    try {
      return await firstValueFrom(this.authService.verifyToken({ token }));
    } catch (err: any) {
      const message = err?.message ?? err?.details ?? JSON.stringify(err);
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      return await firstValueFrom(
        this.authService.refreshToken({ refreshToken }),
      );
    } catch (err: any) {
      const message = err?.message ?? err?.details ?? JSON.stringify(err);
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }
}
