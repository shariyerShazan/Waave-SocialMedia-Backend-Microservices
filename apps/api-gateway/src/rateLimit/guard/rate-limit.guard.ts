/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimiterService } from '../rateLimit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  RateLimitKeyType,
} from '../decorator/rate-limit.decorator';

import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true;
    }

    let req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    let res = context.switchToHttp().getResponse<Response>();

    if (!req || !req.headers) {
      const gqlCtx = GqlExecutionContext.create(context).getContext();
      req = gqlCtx?.req;
      res = gqlCtx?.res;
    }

    if (!req) {
      return true;
    }

    const ip = this.getClientIp(req);

    const key = this.buildKey(req, config.key ?? RateLimitKeyType.IP, ip);

    const result = await this.rateLimiterService.consume(
      key,
      config.limit,
      config.window,
    );

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', config.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.reset);
    }

    if (!result.allowed) {
      throw new HttpException(
        {
          success: false,
          message: 'Too many requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  }

  private getEmail(req: Request): string {
    return (
      ((req.body as Record<string, unknown>)?.email as string | undefined) ||
      ((req.query as Record<string, unknown>)?.email as string | undefined) ||
      ((req.params as Record<string, unknown>)?.email as string | undefined) ||
      'anonymous'
    );
  }

  private buildKey(
    req: AuthenticatedRequest,
    keyType: RateLimitKeyType,
    ip: string,
  ): string {
    const route = `${req.method}:${req.route?.path ?? req.path}`;

    switch (keyType) {
      case RateLimitKeyType.IP_EMAIL:
        return `rl:${route}:${ip}:${this.getEmail(req)}`;

      case RateLimitKeyType.USER_ID:
        return `rl:${route}:${req.user?.userId ?? 'anonymous'}`;

      case RateLimitKeyType.IP_USER_ID:
        return `rl:${route}:${ip}:${req.user?.userId ?? 'anonymous'}`;

      case RateLimitKeyType.IP:
      default:
        return `rl:${route}:${ip}`;
    }
  }
}
