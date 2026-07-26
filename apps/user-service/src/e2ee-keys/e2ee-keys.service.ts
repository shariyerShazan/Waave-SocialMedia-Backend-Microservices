/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DevicePlatform } from '@prisma/user-client';
import { UserPrismaService } from '../prisma/prisma.service';

@Injectable()
export class E2eeKeysService {
  private readonly logger = new Logger(E2eeKeysService.name);
  private readonly MIN_OTK_THRESHOLD = 20;

  constructor(private readonly prisma: UserPrismaService) {}

  async registerDevice(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    await this.ensureProfile(data.userId);

    const platform = this.parsePlatform(data.platform);

    const device = await this.prisma.writeDb.userDevice.upsert({
      where: {
        userId_deviceId: {
          userId: data.userId,
          deviceId: data.deviceId,
        },
      },
      create: {
        userId: data.userId,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        platform,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        deviceName: data.deviceName,
        platform,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    this.logger.log(`Device registered: ${data.userId}/${data.deviceId}`);

    return {
      success: true,
      message: 'Device registered',
      device: this.mapDevice(device),
    };
  }

  async listDevices(userId: string) {
    const devices = await this.prisma.readDb.userDevice.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    });

    return {
      success: true,
      devices: devices.map((d) => this.mapDevice(d)),
    };
  }

  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.writeDb.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
      throw new RpcException({ code: 5, message: 'Device not found' });
    }

    await this.prisma.writeDb.$transaction(async (tx) => {
      await tx.userDevice.update({
        where: { id: device.id },
        data: { isActive: false },
      });
      await tx.userOneTimePreKey.deleteMany({
        where: { deviceRecordId: device.id },
      });
      await tx.userSignedPreKey.updateMany({
        where: { deviceRecordId: device.id, isCurrent: true },
        data: { isCurrent: false },
      });
    });

    return { success: true, message: 'Device revoked' };
  }

  async uploadKeys(data: {
    userId: string;
    deviceId: string;
    identityKey: { publicKey: string; registrationId: number };
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    const device = await this.requireActiveDevice(data.userId, data.deviceId);

    await this.prisma.writeDb.$transaction(async (tx) => {
      await tx.userIdentityKey.upsert({
        where: { deviceRecordId: device.id },
        create: {
          userId: data.userId,
          deviceRecordId: device.id,
          publicKey: data.identityKey.publicKey,
          registrationId: data.identityKey.registrationId,
        },
        update: {
          publicKey: data.identityKey.publicKey,
          registrationId: data.identityKey.registrationId,
        },
      });

      await tx.userSignedPreKey.updateMany({
        where: { deviceRecordId: device.id, isCurrent: true },
        data: { isCurrent: false },
      });

      await tx.userSignedPreKey.upsert({
        where: {
          deviceRecordId_keyId: {
            deviceRecordId: device.id,
            keyId: data.signedPreKey.keyId,
          },
        },
        create: {
          userId: data.userId,
          deviceRecordId: device.id,
          keyId: data.signedPreKey.keyId,
          publicKey: data.signedPreKey.publicKey,
          signature: data.signedPreKey.signature,
          isCurrent: true,
        },
        update: {
          publicKey: data.signedPreKey.publicKey,
          signature: data.signedPreKey.signature,
          isCurrent: true,
        },
      });

      if (data.oneTimePreKeys.length) {
        await tx.userOneTimePreKey.createMany({
          data: data.oneTimePreKeys.map((k) => ({
            userId: data.userId,
            deviceRecordId: device.id,
            keyId: k.keyId,
            publicKey: k.publicKey,
          })),
          skipDuplicates: true,
        });
      }

      await tx.userDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date() },
      });
    });

    this.logger.log(
      `Keys uploaded for ${data.userId}/${data.deviceId} (otk=${data.oneTimePreKeys.length})`,
    );

    return { success: true, message: 'Keys uploaded' };
  }

  async rotateSignedPreKey(data: {
    userId: string;
    deviceId: string;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
  }) {
    const device = await this.requireActiveDevice(data.userId, data.deviceId);

    await this.prisma.writeDb.$transaction(async (tx) => {
      await tx.userSignedPreKey.updateMany({
        where: { deviceRecordId: device.id, isCurrent: true },
        data: { isCurrent: false },
      });

      await tx.userSignedPreKey.upsert({
        where: {
          deviceRecordId_keyId: {
            deviceRecordId: device.id,
            keyId: data.signedPreKey.keyId,
          },
        },
        create: {
          userId: data.userId,
          deviceRecordId: device.id,
          keyId: data.signedPreKey.keyId,
          publicKey: data.signedPreKey.publicKey,
          signature: data.signedPreKey.signature,
          isCurrent: true,
        },
        update: {
          publicKey: data.signedPreKey.publicKey,
          signature: data.signedPreKey.signature,
          isCurrent: true,
        },
      });
    });

    return { success: true, message: 'Signed prekey rotated' };
  }

  async refillOneTimePreKeys(data: {
    userId: string;
    deviceId: string;
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    const device = await this.requireActiveDevice(data.userId, data.deviceId);

    await this.prisma.writeDb.userOneTimePreKey.createMany({
      data: data.oneTimePreKeys.map((k) => ({
        userId: data.userId,
        deviceRecordId: device.id,
        keyId: k.keyId,
        publicKey: k.publicKey,
      })),
      skipDuplicates: true,
    });

    return { success: true, message: 'One-time prekeys refilled' };
  }

  async getKeyBundle(
    targetUserId: string,
    requesterId: string,
    deviceId?: string,
  ) {
    const devices = await this.prisma.writeDb.userDevice.findMany({
      where: {
        userId: targetUserId,
        isActive: true,
        ...(deviceId ? { deviceId } : {}),
        identityKey: { isNot: null },
      },
      include: {
        identityKey: true,
        signedPreKeys: { where: { isCurrent: true }, take: 1 },
      },
    });

    if (!devices.length) {
      return {
        success: false,
        message: 'No key bundles available',
        userId: targetUserId,
        devices: [],
      };
    }

    const bundles: Array<{
      deviceId: string;
      platform: string;
      deviceName: string;
      registrationId: number;
      identityKey: { publicKey: string; registrationId: number };
      signedPreKey: { keyId: number; publicKey: string; signature: string };
      oneTimePreKey?: { keyId: number; publicKey: string };
    }> = [];

    for (const device of devices) {
      const otk = await this.consumeOneTimePreKey(device.id);
      const signed = device.signedPreKeys[0];

      if (!device.identityKey || !signed) {
        continue;
      }

      bundles.push({
        deviceId: device.deviceId,
        platform: device.platform,
        deviceName: device.deviceName,
        registrationId: device.identityKey.registrationId,
        identityKey: {
          publicKey: device.identityKey.publicKey,
          registrationId: device.identityKey.registrationId,
        },
        signedPreKey: {
          keyId: signed.keyId,
          publicKey: signed.publicKey,
          signature: signed.signature,
        },
        oneTimePreKey: otk
          ? { keyId: otk.keyId, publicKey: otk.publicKey }
          : undefined,
      });
    }

    this.logger.debug(
      `Key bundle requested by ${requesterId} for ${targetUserId} (${bundles.length} devices)`,
    );

    return {
      success: true,
      message: 'Key bundle fetched',
      userId: targetUserId,
      devices: bundles,
    };
  }

  async getKeyBundlesForUsers(userIds: string[], requesterId: string) {
    const unique = [...new Set(userIds.filter(Boolean))];
    const bundles: Array<{
      userId: string;
      devices: Array<{
        deviceId: string;
        platform: string;
        deviceName: string;
        registrationId: number;
        identityKey: { publicKey: string; registrationId: number };
        signedPreKey: { keyId: number; publicKey: string; signature: string };
        oneTimePreKey?: { keyId: number; publicKey: string };
      }>;
    }> = [];

    for (const userId of unique) {
      const result = await this.getKeyBundle(userId, requesterId);
      bundles.push({
        userId,
        devices: result.devices,
      });
    }

    return { success: true, bundles };
  }

  async countOneTimePreKeys(userId: string, deviceId: string) {
    const device = await this.requireActiveDevice(userId, deviceId);
    const count = await this.prisma.readDb.userOneTimePreKey.count({
      where: { deviceRecordId: device.id, isUsed: false },
    });

    return {
      success: true,
      count,
      needsRefill: count < this.MIN_OTK_THRESHOLD,
    };
  }

  private async consumeOneTimePreKey(deviceRecordId: string) {
    return this.prisma.writeDb.$transaction(async (tx) => {
      const key = await tx.userOneTimePreKey.findFirst({
        where: { deviceRecordId, isUsed: false },
        orderBy: { createdAt: 'asc' },
      });

      if (!key) return null;

      await tx.userOneTimePreKey.update({
        where: { id: key.id },
        data: { isUsed: true, usedAt: new Date() },
      });

      return key;
    });
  }

  private async requireActiveDevice(userId: string, deviceId: string) {
    const device = await this.prisma.writeDb.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device || !device.isActive) {
      throw new RpcException({
        code: 5,
        message: 'Active device not found. Register device first.',
      });
    }

    return device;
  }

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.readDb.profile.findUnique({
      where: { id: userId },
    });
    if (!profile) {
      throw new RpcException({ code: 5, message: 'User profile not found' });
    }
  }

  private parsePlatform(platform: any): DevicePlatform {
    const upper = (platform || 'OTHER').toUpperCase();
    if (Object.values(DevicePlatform).includes(upper)) {
      return upper;
    }
    return DevicePlatform.OTHER;
  }

  private mapDevice(device: {
    id: string;
    deviceId: string;
    deviceName: string;
    platform: DevicePlatform;
    osVersion: string | null;
    appVersion: string | null;
    isActive: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }) {
    return {
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      platform: device.platform,
      osVersion: device.osVersion || '',
      appVersion: device.appVersion || '',
      isActive: device.isActive,
      lastSeenAt: device.lastSeenAt.getTime(),
      createdAt: device.createdAt.toISOString(),
    };
  }
}
