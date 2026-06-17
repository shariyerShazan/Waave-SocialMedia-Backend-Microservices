import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
  }

  generateOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  async blacklistToken(token: string, ttlsec: number) {
    await this.client.set(`blocklist:${token}`, '1', 'EX', ttlsec);
  }

  async isBlackListed(token: string): Promise<boolean> {
    const result = await this.client.get(`blocklist:${token}`);
    return result !== null;
  }

  async saveRefreshToken(token: string, userId: string, ttlsec: number) {
    await this.client.set(`refresh:${userId}`, token, 'EX', ttlsec);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const token = await this.client.get(`refresh:${userId}`);
    return token;
  }

  async deleteRefreshToken(userId: string) {
    await this.client.del(`refresh:${userId}`);
  }

  async incrementLoginAttempts(email: string): Promise<number> {
    const key = `login:attempt:${email}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, 900);
    }
    return count;
  }

  async getLoginAttempts(email: string): Promise<number> {
    const val = await this.client.get(`login:attempt:${email}`);
    return Number(val || '0');
  }

  async resetLoginAttempts(email: string) {
    await this.client.del(`login:attempts:${email}`);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async saveOtp(email: string, topic: string, otp: string, ttl = 300) {
    await this.client.set(`otp-${topic}:${email}`, otp, 'EX', ttl);
  }

  async createOtp(email: string, topic: string, ttl = 300): Promise<string> {
    const otp = this.generateOtp();

    await this.saveOtp(email, topic, otp, ttl);

    return otp;
  }

  async getOtp(email: string, topic: string): Promise<string | null> {
    return this.client.get(`otp-${topic}:${email}`);
  }

  async verifyOtp(email: string, topic: string, otp: string): Promise<boolean> {
    const storedOtp = await this.getOtp(email, topic);

    return storedOtp === otp;
  }

  async deleteOtp(email: string, topic: string) {
    await this.client.del(`otp-${topic}:${email}`);
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
}
