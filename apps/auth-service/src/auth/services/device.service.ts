import { Injectable } from '@nestjs/common';
import { AtuhPrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: AtuhPrismaService) {}

  async trustDevice(
    userId: string,
    deviceId: string,
    deviceFingerprint: string,
    name?: string,
  ) {
    return this.prisma.writeDb.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
      create: {
        userId,
        deviceId,
        deviceFingerprint,
        name,
        isTrusted: true,
      },
      update: {
        isTrusted: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async untrustDevice(userId: string, deviceFingerprint: string) {
    await this.prisma.writeDb.trustedDevice.updateMany({
      where: {
        userId,
        deviceFingerprint,
      },
      data: {
        isTrusted: false,
      },
    });
  }

  async removeDevice(userId: string, id: string) {
    await this.prisma.writeDb.trustedDevice.deleteMany({
      where: {
        id,
        userId,
      },
    });
  }

  async getTrustedDevices(userId: string) {
    return this.prisma.readDb.trustedDevice.findMany({
      where: {
        userId,
        isTrusted: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    const device = await this.prisma.readDb.trustedDevice.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
    });
    return device ? device.isTrusted : false;
  }
}
