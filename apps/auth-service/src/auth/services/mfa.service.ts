import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AtuhPrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MfaService {
  constructor(private readonly prisma: AtuhPrismaService) {}

  private base32Decode(base32String: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanString = base32String.replace(/=+$/, '').toUpperCase();
    const length = cleanString.length;
    let bits = 0;
    let value = 0;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));
    let index = 0;

    for (let i = 0; i < length; i++) {
      const val = alphabet.indexOf(cleanString.charAt(i));
      if (val === -1) {
        throw new Error('Invalid base32 char');
      }
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        buffer[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    return buffer;
  }

  private generateHotp(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    let count = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = count & 0xff;
      count = count >> 8;
    }
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hmacResult = hmac.digest();
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);
    const otp = code % 1000000;
    return otp.toString().padStart(6, '0');
  }

  generateMfaSecret(email: string) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const otpAuthUrl = `otpauth://totp/Waave:${email}?secret=${secret}&issuer=Waave`;
    return { secret, otpAuthUrl };
  }

  verifyTotpCode(secret: string, token: string): boolean {
    const counter = Math.floor(Date.now() / 1000 / 30);
    for (let i = -1; i <= 1; i++) {
      if (this.generateHotp(secret, counter + i) === token) {
        return true;
      }
    }
    return false;
  }

  async verifyMfa(userId: string, code: string): Promise<boolean> {
    const mfa = await this.prisma.readDb.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.isEnabled) {
      return false;
    }

    if (code.length === 6) {
      return this.verifyTotpCode(mfa.secret, code);
    }

    const recoveryCodes = await this.prisma.readDb.recoveryCode.findMany({
      where: { userId, isUsed: false },
    });

    for (const record of recoveryCodes) {
      const match = await bcrypt.compare(code, record.codeHash);
      if (match) {
        await this.prisma.writeDb.recoveryCode.update({
          where: { id: record.id },
          data: { isUsed: true, usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  async enableMfa(userId: string, secret: string, code: string) {
    const valid = this.verifyTotpCode(secret, code);
    if (!valid) {
      return null;
    }

    await this.prisma.writeDb.twoFactorAuth.upsert({
      where: { userId },
      create: { userId, secret, isEnabled: true },
      update: { secret, isEnabled: true },
    });

    const plainRecoveryCodes: string[] = [];
    const hashSolt = Number(process.env.HASH_SOLT || '10');

    await this.prisma.writeDb.recoveryCode.deleteMany({
      where: { userId },
    });

    for (let i = 0; i < 8; i++) {
      const prefix = crypto.randomBytes(2).toString('hex');
      const suffix = crypto.randomBytes(2).toString('hex');
      const plainCode = `${prefix}-${suffix}`;
      plainRecoveryCodes.push(plainCode);

      const hash = await bcrypt.hash(plainCode, hashSolt);
      await this.prisma.writeDb.recoveryCode.create({
        data: { userId, codeHash: hash },
      });
    }

    return plainRecoveryCodes;
  }

  async disableMfa(userId: string) {
    await this.prisma.writeDb.twoFactorAuth.deleteMany({
      where: { userId },
    });
    await this.prisma.writeDb.recoveryCode.deleteMany({
      where: { userId },
    });
  }
}
