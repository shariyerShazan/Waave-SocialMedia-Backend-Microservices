import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../../prisma/prisma.service';
import { AuthRedisService } from '../../redis/redis.service';
import { Session } from '@prisma/auth-client';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: AuthPrismaService,
    private readonly redis: AuthRedisService,
  ) {}

  private parseUserAgent(userAgent?: string) {
    if (!userAgent) {
      return { browser: 'Unknown', os: 'Unknown', platform: 'Unknown' };
    }
    let browser = 'Unknown';
    let os = 'Unknown';
    let platform = 'Web';

    const ua = userAgent.toLowerCase();

    if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('safari')) {
      browser = 'Safari';
    } else if (ua.includes('edge')) {
      browser = 'Edge';
    }

    if (ua.includes('windows')) {
      os = 'Windows';
      platform = 'Desktop';
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
      os = 'macOS';
      platform = 'Desktop';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
      platform = 'Mobile';
    } else if (ua.includes('android')) {
      os = 'Android';
      platform = 'Mobile';
    } else if (ua.includes('linux')) {
      os = 'Linux';
      platform = 'Desktop';
    }

    return { browser, os, platform };
  }

  async createSession(
    userId: string,
    deviceId: string,
    deviceFingerprint: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { browser, os, platform } = this.parseUserAgent(userAgent);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.writeDb.session.create({
      data: {
        userId,
        deviceId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        browser,
        os,
        platform,
        expiresAt,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
      },
    });

    const ttlSec = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.saveSessionCache(session.id, session, ttlSec);

    return session;
  }

  async validateSession(sid: string): Promise<boolean> {
    const cached = await this.redis.getSessionCache<Session>(sid);
    if (cached) {
      if (
        cached.isRevoked ||
        new Date(cached.expiresAt).getTime() < Date.now()
      ) {
        return false;
      }
      await this.touchSession(sid, cached);
      return true;
    }

    const session = await this.prisma.readDb.session.findUnique({
      where: { id: sid },
    });

    if (
      !session ||
      session.isRevoked ||
      session.expiresAt.getTime() < Date.now()
    ) {
      return false;
    }

    const ttlSec = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000,
    );
    await this.redis.saveSessionCache(sid, session, ttlSec);
    await this.touchSession(sid, session);

    return true;
  }

  async touchSession(sid: string, sessionData: Session) {
    const lastActivity = new Date(sessionData.lastActivity).getTime();
    const now = Date.now();

    if (now - lastActivity > 5 * 60 * 1000) {
      const newExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
      try {
        await this.prisma.writeDb.session.update({
          where: { id: sid },
          data: {
            lastActivity: new Date(now),
            expiresAt: newExpiresAt,
          },
        });
        const updatedCache = {
          ...sessionData,
          lastActivity: new Date(now),
          expiresAt: newExpiresAt,
        };
        const ttlSec = Math.floor((newExpiresAt.getTime() - now) / 1000);
        await this.redis.saveSessionCache(sid, updatedCache, ttlSec);
      } catch {
        await this.redis.deleteSessionCache(sid);
      }
    }
  }

  async revokeSession(userId: string, sid: string) {
    await this.prisma.writeDb.session.updateMany({
      where: { id: sid, userId },
      data: { isRevoked: true },
    });
    await this.redis.deleteSessionCache(sid);
  }

  async revokeAllSessions(userId: string) {
    const activeSessions = await this.prisma.readDb.session.findMany({
      where: { userId, isRevoked: false },
      select: { id: true },
    });

    await this.prisma.writeDb.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    for (const session of activeSessions) {
      await this.redis.deleteSessionCache(session.id);
    }

    await this.prisma.writeDb.securityState.upsert({
      where: { userId },
      create: {
        userId,
        tokenVersion: 1,
      },
      update: {
        tokenVersion: { increment: 1 },
      },
    });
  }

  async getActiveSessions(userId: string) {
    return this.prisma.readDb.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }
}
