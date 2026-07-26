import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtPayload } from './auth-guard';

export interface WsJwtPayload extends JwtPayload {
  deviceId?: string;
}

export interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
  role: string;
  deviceId: string;
  userName?: string;
  avatar?: string;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    try {
      await this.authenticate(client);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unauthorized websocket';
      throw new WsException(message);
    }
  }

  async authenticate(client: AuthenticatedSocket): Promise<WsJwtPayload> {
    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    let payload: WsJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<WsJwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const deviceId =
      (client.handshake.auth?.deviceId as string | undefined) ||
      (client.handshake.query?.deviceId as string | undefined) ||
      payload.deviceId;

    if (!deviceId) {
      throw new UnauthorizedException('Device id required');
    }

    client.userId = payload.userId;
    client.email = payload.email;
    client.role = payload.role;
    client.deviceId = deviceId;
    client.userName =
      (client.handshake.auth?.userName as string | undefined) || undefined;
    client.avatar =
      (client.handshake.auth?.avatar as string | undefined) || undefined;

    return payload;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken.replace(/^Bearer\s+/i, '');
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.length > 0) {
      return header.replace(/^Bearer\s+/i, '');
    }

    return null;
  }
}
