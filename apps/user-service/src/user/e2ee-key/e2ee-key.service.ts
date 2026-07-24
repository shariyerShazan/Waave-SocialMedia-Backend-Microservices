/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  RegisterIdentityKeyDto,
  RegisterDeviceDto,
  UploadPreKeysDto,
} from '@app/common';
import { UserPrismaService } from '../../prisma/prisma.service';
import { UserRedisService } from '../../redis/redis.service';

@Injectable()
export class E2EEKeyService {
  private readonly logger = new Logger(E2EEKeyService.name);
  private readonly OTK_REFILL_THRESHOLD = 10;

  constructor(
    private readonly prisma: UserPrismaService,
    private readonly redis: UserRedisService,
  ) {}

  async registerIdentityKey(userId: string, dto: RegisterIdentityKeyDto) {
    await this.prisma.writeDb.userIdentityKey.upsert({
      where: { userId },
      create: {
        userId,
        publicKey: dto.publicKey,
        fingerprint: dto.fingerprint,
      },
      update: {
        publicKey: dto.publicKey,
        fingerprint: dto.fingerprint,
        updatedAt: new Date(),
      },
    });

    await this.redis.invalidateKeyBundle(userId);

    this.logger.log(
      `🔑 Identity key registered: ${userId} [${dto.fingerprint.substring(0, 17)}...]`,
    );

    return {
      success: true,
      fingerprint: dto.fingerprint,
      message: 'Identity key registered successfully',
    };
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.writeDb.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: {
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName ?? 'unknown',
        platform: dto.platform ?? 'unknown',
        pushToken: dto.pushToken,
        isActive: true,
      },
      update: {
        deviceName: dto.deviceName ?? 'unknown',
        platform: dto.platform ?? 'unknown',
        pushToken: dto.pushToken,
        lastActiveAt: new Date(),
        isActive: true,
      },
    });

    this.logger.log(
      `📱 Device registered: ${userId} / ${dto.deviceId} (${dto.platform})`,
    );

    return {
      success: true,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      platform: device.platform,
      message: 'Device registered successfully',
    };
  }

  async getMyDevices(userId: string) {
    const devices = await this.prisma.readDb.userDevice.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
    });

    return {
      success: true,
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt.toISOString(),
        registeredAt: d.registeredAt.toISOString(),
        isActive: d.isActive,
      })),
    };
  }

  async deactivateDevice(userId: string, deviceId: string) {
    const device = await this.prisma.readDb.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
      throw new RpcException({ code: 5, message: 'Device not found' });
    }

    await this.prisma.writeDb.userDevice.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { isActive: false },
    });

    await this.redis.invalidateKeyBundle(userId);

    return { success: true, message: 'Device deactivated' };
  }

  async updateDeviceLastActive(userId: string, deviceId: string) {
    await this.prisma.writeDb.userDevice
      .update({
        where: { userId_deviceId: { userId, deviceId } },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});
  }

  async uploadPreKeys(userId: string, dto: UploadPreKeysDto) {
    const device = await this.prisma.readDb.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
    });

    if (!device) {
      throw new RpcException({
        code: 5,
        message: `Device ${dto.deviceId} not found. Register device first.`,
      });
    }

    // Upsert signed prekey
    await this.prisma.writeDb.userSignedPreKey.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: {
        userId,
        deviceId: dto.deviceId,
        keyId: dto.signedPreKey.keyId,
        publicKey: dto.signedPreKey.publicKey,
        signature: dto.signedPreKey.signature,
      },
      update: {
        keyId: dto.signedPreKey.keyId,
        publicKey: dto.signedPreKey.publicKey,
        signature: dto.signedPreKey.signature,
        updatedAt: new Date(),
      },
    });

    // Upload one-time prekeys — upsert each (idempotent)
    await this.prisma.writeDb.$transaction(
      dto.oneTimePreKeys.map((k) =>
        this.prisma.writeDb.userOneTimePreKey.upsert({
          where: {
            userId_deviceId_keyId: {
              userId,
              deviceId: dto.deviceId,
              keyId: k.keyId,
            },
          },
          create: {
            userId,
            deviceId: dto.deviceId,
            keyId: k.keyId,
            publicKey: k.publicKey,
          },
          update: {
            publicKey: k.publicKey,
            consumed: false,
          },
        }),
      ),
    );

    const available = await this.prisma.readDb.userOneTimePreKey.count({
      where: { userId, deviceId: dto.deviceId, consumed: false },
    });

    await this.redis.invalidateKeyBundle(userId);

    this.logger.log(
      `🔑 PreKeys uploaded: ${userId}/${dto.deviceId} — ${dto.oneTimePreKeys.length} OTKs, total available: ${available}`,
    );

    return {
      success: true,
      availableOneTimeKeys: available,
      shouldRefill: available < this.OTK_REFILL_THRESHOLD,
      message: 'PreKeys uploaded successfully',
    };
  }

  async refillOneTimePreKeys(
    userId: string,
    deviceId: string,
    oneTimePreKeys: { keyId: number; publicKey: string }[],
  ) {
    const device = await this.prisma.readDb.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
      throw new RpcException({
        code: 5,
        message: `Device ${deviceId} not found.`,
      });
    }

    await this.prisma.writeDb.$transaction(
      oneTimePreKeys.map((k) =>
        this.prisma.writeDb.userOneTimePreKey.upsert({
          where: {
            userId_deviceId_keyId: { userId, deviceId, keyId: k.keyId },
          },
          create: { userId, deviceId, keyId: k.keyId, publicKey: k.publicKey },
          update: { publicKey: k.publicKey, consumed: false },
        }),
      ),
    );

    const available = await this.prisma.readDb.userOneTimePreKey.count({
      where: { userId, deviceId, consumed: false },
    });

    await this.redis.invalidateKeyBundle(userId);

    return {
      success: true,
      availableOneTimeKeys: available,
      shouldRefill: available < this.OTK_REFILL_THRESHOLD,
    };
  }

  async getOneTimeKeyCount(userId: string, deviceId: string) {
    const available = await this.prisma.readDb.userOneTimePreKey.count({
      where: { userId, deviceId, consumed: false },
    });

    return {
      available,
      shouldRefill: available < this.OTK_REFILL_THRESHOLD,
      threshold: this.OTK_REFILL_THRESHOLD,
    };
  }

  async getKeyBundle(userId: string, deviceId?: string) {
    // Cache check (identity + signed key only — OTK is consumed per-use)
    const cacheKey = `keybundle:${userId}:${deviceId ?? 'default'}`;
    const cached = await this.redis.getCache<any>(cacheKey);
    if (cached) return cached;

    // Resolve device
    const device = deviceId
      ? await this.prisma.readDb.userDevice.findUnique({
          where: { userId_deviceId: { userId, deviceId } },
          select: { userId: true, deviceId: true },
        })
      : await this.prisma.readDb.userDevice.findFirst({
          where: { userId, isActive: true },
          orderBy: { lastActiveAt: 'desc' },
          select: { userId: true, deviceId: true },
        });

    if (!device) {
      throw new RpcException({
        code: 5,
        message: `No active device found for user ${userId}`,
      });
    }

    // Fetch identity + signed key in parallel, consume OTK atomically
    const [identityKey, signedPreKey, oneTimePreKey] = await Promise.all([
      this.prisma.readDb.userIdentityKey.findUnique({ where: { userId } }),
      this.prisma.readDb.userSignedPreKey.findUnique({
        where: { userId_deviceId: { userId, deviceId: device.deviceId } },
      }),
      this.consumeOneTimePreKey(userId, device.deviceId),
    ]);

    if (!identityKey) {
      throw new RpcException({
        code: 5,
        message: `Identity key not found for user ${userId}. User must register keys first.`,
      });
    }

    if (!signedPreKey) {
      throw new RpcException({
        code: 5,
        message: `Signed prekey not found for device ${device.deviceId}`,
      });
    }

    const bundle = {
      userId,
      deviceId: device.deviceId,
      identityKey: {
        publicKey: identityKey.publicKey,
        fingerprint: identityKey.fingerprint,
      },
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.publicKey,
        signature: signedPreKey.signature,
      },
      // null = no OTK left — sender must use fallback (no forward secrecy for this session)
      oneTimePreKey: oneTimePreKey
        ? { keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey }
        : null,
    };

    // Cache 30s — OTK already consumed so safe; avoids hammering DB
    await this.redis.setCache(cacheKey, bundle, 30);

    return bundle;
  }

  // Atomically consume one OTK — prevents reuse across concurrent requests
  private async consumeOneTimePreKey(userId: string, deviceId: string) {
    // Find oldest unconsumed key
    const key = await this.prisma.readDb.userOneTimePreKey.findFirst({
      where: { userId, deviceId, consumed: false },
      orderBy: { createdAt: 'asc' },
    });

    if (!key) return null;

    // Mark as consumed on primary — write goes to primary
    await this.prisma.writeDb.userOneTimePreKey.update({
      where: { id: key.id },
      data: { consumed: true },
    });

    // Async cleanup of old consumed keys (fire & forget)
    this.prisma.writeDb.userOneTimePreKey
      .deleteMany({
        where: {
          userId,
          deviceId,
          consumed: true,
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      })
      .catch((err: any) => {
        console.log(err);
      });

    return key;
  }
}
