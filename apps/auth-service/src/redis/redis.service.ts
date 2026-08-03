import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AuthRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.AUTH_REDIS_HOST || 'localhost',
      port: Number(process.env.AUTH_REDIS_PORT) || 6379,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  generateOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  async blacklistToken(jti: string, ttlsec: number) {
    await this.client.set(`auth:blacklist:${jti}`, '1', 'EX', ttlsec);
  }

  async isBlackListed(jti: string): Promise<boolean> {
    const result = await this.client.get(`auth:blacklist:${jti}`);
    return result !== null;
  }

  async saveRefreshToken(userId: string, token: string, ttlsec: number) {
    await this.client.set(`refresh:${userId}`, token, 'EX', ttlsec);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`refresh:${userId}`);
  }

  async deleteRefreshToken(userId: string) {
    await this.client.del(`refresh:${userId}`);
  }

  async incrementLoginAttempts(email: string): Promise<number> {
    const key = `auth:attempts:${email}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, 900);
    }
    return count;
  }

  async getLoginAttempts(email: string): Promise<number> {
    const val = await this.client.get(`auth:attempts:${email}`);
    return Number(val || '0');
  }

  async resetLoginAttempts(email: string) {
    await this.client.del(`auth:attempts:${email}`);
  }

  async saveOtp(email: string, topic: string, otp: string, ttl = 300) {
    await this.client.set(`auth:otp:${topic}:${email}`, otp, 'EX', ttl);
  }

  async createOtp(email: string, topic: string, ttl = 300): Promise<string> {
    const otp = this.generateOtp();
    await this.saveOtp(email, topic, otp, ttl);
    return otp;
  }

  async getOtp(email: string, topic: string): Promise<string | null> {
    return this.client.get(`auth:otp:${topic}:${email}`);
  }

  async verifyOtp(email: string, topic: string, otp: string): Promise<boolean> {
    const storedOtp = await this.getOtp(email, topic);
    return storedOtp === otp;
  }

  async deleteOtp(email: string, topic: string) {
    await this.client.del(`auth:otp:${topic}:${email}`);
  }

  async setCache(key: string, data: any, ttlsec = 3600) {
    await this.client.set(`cache:${key}`, JSON.stringify(data), 'EX', ttlsec);
  }

  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.client.get(`cache:${key}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async invalidateCache(key: string) {
    await this.client.del(`cache:${key}`);
  }

  async invalidateMultipleCaches(keys: string[]) {
    const prefixedKeys = keys.map((k) => `cache:${k}`);
    if (prefixedKeys.length > 0) {
      await this.client.del(...prefixedKeys);
    }
  }

  async acquireDistributedLock(userId: string, ttlSec = 5): Promise<boolean> {
    const key = `auth:lock:db:${userId}`;
    const result = await this.client.set(key, 'locked', 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  async releaseDistributedLock(userId: string) {
    const key = `auth:lock:db:${userId}`;
    await this.client.del(key);
  }

  async saveSessionCache(sid: string, data: any, ttlSec: number) {
    await this.client.set(
      `auth:session:${sid}`,
      JSON.stringify(data),
      'EX',
      ttlSec,
    );
  }

  async getSessionCache<T>(sid: string): Promise<T | null> {
    const data = await this.client.get(`auth:session:${sid}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async deleteSessionCache(sid: string) {
    await this.client.del(`auth:session:${sid}`);
  }

  async saveMfaTempState(userId: string, data: any, ttlSec = 300) {
    await this.client.set(
      `auth:mfa:temp:${userId}`,
      JSON.stringify(data),
      'EX',
      ttlSec,
    );
  }

  async getMfaTempState<T>(userId: string): Promise<T | null> {
    const data = await this.client.get(`auth:mfa:temp:${userId}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async deleteMfaTempState(userId: string) {
    await this.client.del(`auth:mfa:temp:${userId}`);
  }
}
