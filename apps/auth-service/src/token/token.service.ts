/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthRedisService } from '../redis/redis.service';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
}
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: AuthRedisService,
  ) {}

  generateAccessToken(payload: TokenPayload): string {
    const signOptions: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES! || '15m') as any,
    };

    return this.jwt.sign({ ...payload }, signOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    const signOptions: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES! || '7d') as any,
    };
    return this.jwt.sign({ ...payload }, signOptions);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const blackListed = await this.redis.isBlackListed(token);
      if (blackListed) return null;
      return this.jwt.verify<TokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET!,
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return this.jwt.verify<TokenPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  getTokenTTL(token: string): number {
    try {
      const decoded = this.jwt.decode(token);
      if (!decoded?.exp) return 0;
      return decoded.exp - Math.floor(Date.now() / 1000);
    } catch (error) {
      console.log(error);
      return 0;
    }
  }
}
