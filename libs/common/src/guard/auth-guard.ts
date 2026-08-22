import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
}

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  private getRequest(context: ExecutionContext): AuthenticatedRequest {
    let req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req || !req.headers) {
      const gqlCtx = GqlExecutionContext.create(context).getContext();
      req = gqlCtx?.req;
    }
    return req;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);

    if (!request || !request.headers) {
      throw new UnauthorizedException('Access token required');
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Access token required');
    }

    const token = authHeader.replace('Bearer ', '');

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    request.user = payload;

    return true;
  }
}
