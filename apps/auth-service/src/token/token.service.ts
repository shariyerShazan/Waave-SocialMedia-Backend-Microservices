import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthRedisService } from '../redis/redis.service';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
  sid?: string;
  jti?: string;
  tokenVersion?: number;
  deviceFingerprint?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
  familyId: string;
  email?: string;
  role?: string;
  deviceId?: string;
}

interface DecodedJwt {
  jti?: string;
  sub?: string;
  email?: string;
  role?: string;
  deviceId?: string;
  sid?: string;
  tokenVersion?: number;
  deviceFingerprint?: string;
  familyId?: string;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: AuthRedisService,
  ) {}

  generateAccessToken(
    payload: TokenPayload,
    jti: string,
    sid: string,
    tokenVersion: number,
  ): string {
    const signOptions: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-12345',
      expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as '15m',
      issuer: 'waave-auth-service',
      subject: payload.userId,
      jwtid: jti,
    };

    const claims = {
      email: payload.email,
      role: payload.role,
      deviceId: payload.deviceId,
      sid,
      tokenVersion,
      deviceFingerprint: payload.deviceFingerprint,
    };

    return this.jwt.sign(claims, signOptions);
  }

  generateRefreshToken(userId: string, jti: string, familyId: string): string {
    const signOptions: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-12345',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as '7d',
      issuer: 'waave-auth-service',
      subject: userId,
      jwtid: jti,
    };

    const claims = {
      familyId,
    };

    return this.jwt.sign(claims, signOptions);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const decodedPayload = (this.jwt.decode as (t: string) => unknown)(
        token,
      ) as DecodedJwt | null;
      if (decodedPayload?.jti) {
        const blackListed = await this.redis.isBlackListed(decodedPayload.jti);
        if (blackListed) {
          return null;
        }
      }

      const verified = (this.jwt.verify as (t: string, o: unknown) => unknown)(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-12345',
        },
      ) as DecodedJwt;

      return {
        userId: verified.sub || '',
        email: verified.email || '',
        role: verified.role || '',
        deviceId: verified.deviceId,
        sid: verified.sid,
        jti: verified.jti,
        tokenVersion: verified.tokenVersion,
        deviceFingerprint: verified.deviceFingerprint,
      };
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const verified = (this.jwt.verify as (t: string, o: unknown) => unknown)(
        token,
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-12345',
        },
      ) as DecodedJwt;

      return {
        userId: verified.sub || '',
        jti: verified.jti || '',
        familyId: verified.familyId || '',
      };
    } catch {
      return null;
    }
  }

  getTokenTTL(token: string): number {
    try {
      const decoded = (this.jwt.decode as (t: string) => unknown)(
        token,
      ) as DecodedJwt | null;
      if (!decoded?.exp) {
        return 0;
      }
      return decoded.exp - Math.floor(Date.now() / 1000);
    } catch {
      return 0;
    }
  }
}
