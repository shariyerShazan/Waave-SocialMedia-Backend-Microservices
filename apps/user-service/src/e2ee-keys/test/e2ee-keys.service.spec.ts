import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { E2eeKeysService } from '../e2ee-keys.service';
import { UserPrismaService } from '../../prisma/prisma.service';
import { DevicePlatform } from '@prisma/user-client';

describe('E2eeKeysService', () => {
  let service: E2eeKeysService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      writeDb: {
        userDevice: {
          upsert: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
        },
        userIdentityKey: {
          upsert: jest.fn(),
        },
        userSignedPreKey: {
          updateMany: jest.fn(),
          upsert: jest.fn(),
        },
        userOneTimePreKey: {
          createMany: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation(async (cb) => {
          if (typeof cb === 'function') {
            return cb(prisma.writeDb);
          }
          return Promise.all(cb);
        }),
      },
      readDb: {
        profile: {
          findUnique: jest.fn(),
        },
        userDevice: {
          findMany: jest.fn(),
        },
        userOneTimePreKey: {
          count: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eeKeysService,
        { provide: UserPrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<E2eeKeysService>(E2eeKeysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should throw RpcException if user profile not found', async () => {
      prisma.readDb.profile.findUnique.mockResolvedValue(null);

      await expect(
        service.registerDevice({
          userId: 'u1',
          deviceId: 'd1',
          deviceName: 'Phone',
          platform: 'IOS',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should register and return mapped device if profile exists', async () => {
      prisma.readDb.profile.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.writeDb.userDevice.upsert.mockResolvedValue({
        id: 'dev-1',
        deviceId: 'd1',
        deviceName: 'Phone',
        platform: DevicePlatform.PHONE,
        osVersion: '17.0',
        appVersion: '1.0',
        isActive: true,
        lastSeenAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
      });

      const res = await service.registerDevice({
        userId: 'u1',
        deviceId: 'd1',
        deviceName: 'Phone',
        platform: 'IOS',
      });

      expect(res.success).toBe(true);
      expect(res.device.deviceId).toBe('d1');
      expect(res.device.platform).toBe(DevicePlatform.PHONE);
    });
  });

  describe('listDevices', () => {
    it('should return mapped active devices', async () => {
      prisma.readDb.userDevice.findMany.mockResolvedValue([
        {
          id: 'dev-1',
          deviceId: 'd1',
          deviceName: 'Phone',
          platform: DevicePlatform.PHONE,
          osVersion: null,
          appVersion: null,
          isActive: true,
          lastSeenAt: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const res = await service.listDevices('u1');

      expect(res.success).toBe(true);
      expect(res.devices).toHaveLength(1);
    });
  });

  describe('revokeDevice', () => {
    it('should throw RpcException if device not found', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue(null);

      await expect(service.revokeDevice('u1', 'd1')).rejects.toThrow(
        RpcException,
      );
    });

    it('should deactivate device and delete keys in transaction', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue({ id: 'dev-1' });

      const res = await service.revokeDevice('u1', 'd1');

      expect(res.success).toBe(true);
      expect(prisma.writeDb.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: { isActive: false },
      });
      expect(prisma.writeDb.userOneTimePreKey.deleteMany).toHaveBeenCalledWith({
        where: { deviceRecordId: 'dev-1' },
      });
    });
  });

  describe('uploadKeys', () => {
    it('should throw RpcException if active device not found', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadKeys({
          userId: 'u1',
          deviceId: 'd1',
          identityKey: { publicKey: 'ik', registrationId: 1 },
          signedPreKey: { keyId: 1, publicKey: 'spk', signature: 'sig' },
          oneTimePreKeys: [{ keyId: 1, publicKey: 'otk' }],
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should upload keys for active device', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        isActive: true,
      });

      const res = await service.uploadKeys({
        userId: 'u1',
        deviceId: 'd1',
        identityKey: { publicKey: 'ik', registrationId: 1 },
        signedPreKey: { keyId: 1, publicKey: 'spk', signature: 'sig' },
        oneTimePreKeys: [{ keyId: 1, publicKey: 'otk' }],
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.userIdentityKey.upsert).toHaveBeenCalled();
      expect(prisma.writeDb.userSignedPreKey.upsert).toHaveBeenCalled();
      expect(prisma.writeDb.userOneTimePreKey.createMany).toHaveBeenCalled();
    });
  });

  describe('rotateSignedPreKey', () => {
    it('should rotate signed prekey for active device', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        isActive: true,
      });

      const res = await service.rotateSignedPreKey({
        userId: 'u1',
        deviceId: 'd1',
        signedPreKey: { keyId: 2, publicKey: 'new-spk', signature: 'new-sig' },
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.userSignedPreKey.updateMany).toHaveBeenCalled();
      expect(prisma.writeDb.userSignedPreKey.upsert).toHaveBeenCalled();
    });
  });

  describe('refillOneTimePreKeys', () => {
    it('should refill one-time prekeys for active device', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        isActive: true,
      });

      const res = await service.refillOneTimePreKeys({
        userId: 'u1',
        deviceId: 'd1',
        oneTimePreKeys: [{ keyId: 10, publicKey: 'otk-10' }],
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.userOneTimePreKey.createMany).toHaveBeenCalled();
    });
  });

  describe('getKeyBundle', () => {
    it('should return failure response if no device with identityKey found', async () => {
      prisma.writeDb.userDevice.findMany.mockResolvedValue([]);

      const res = await service.getKeyBundle('target-1', 'req-1');

      expect(res.success).toBe(false);
      expect(res.devices).toEqual([]);
    });

    it('should consume OTK and return key bundle when device and keys exist', async () => {
      prisma.writeDb.userDevice.findMany.mockResolvedValue([
        {
          id: 'dev-1',
          deviceId: 'd1',
          platform: 'IOS',
          deviceName: 'Phone',
          identityKey: { publicKey: 'ik', registrationId: 100 },
          signedPreKeys: [
            { keyId: 1, publicKey: 'spk', signature: 'sig', isCurrent: true },
          ],
        },
      ]);
      prisma.writeDb.userOneTimePreKey.findFirst.mockResolvedValue({
        id: 'otk-1',
        keyId: 5,
        publicKey: 'otk-pub-5',
      });

      const res = await service.getKeyBundle('target-1', 'req-1');

      expect(res.success).toBe(true);
      expect(res.devices).toHaveLength(1);
      expect(res.devices[0].oneTimePreKey).toEqual({
        keyId: 5,
        publicKey: 'otk-pub-5',
      });
    });
  });

  describe('getKeyBundlesForUsers', () => {
    it('should fetch key bundles for multiple user IDs', async () => {
      prisma.writeDb.userDevice.findMany.mockResolvedValue([]);

      const res = await service.getKeyBundlesForUsers(
        ['u1', 'u2'],
        'requester-1',
      );

      expect(res.success).toBe(true);
      expect(res.bundles).toHaveLength(2);
    });
  });

  describe('countOneTimePreKeys', () => {
    it('should return count and needsRefill boolean', async () => {
      prisma.writeDb.userDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        isActive: true,
      });
      prisma.readDb.userOneTimePreKey.count.mockResolvedValue(10);

      const res = await service.countOneTimePreKeys('u1', 'd1');

      expect(res.success).toBe(true);
      expect(res.count).toBe(10);
      expect(res.needsRefill).toBe(true);
    });
  });
});
