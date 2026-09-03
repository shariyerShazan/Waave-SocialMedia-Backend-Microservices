import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from '../device.service';
import { AuthPrismaService } from '../../../prisma/prisma.service';

describe('DeviceService', () => {
  let service: DeviceService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      writeDb: {
        trustedDevice: {
          upsert: jest.fn(),
          updateMany: jest.fn(),
          deleteMany: jest.fn(),
        },
      },
      readDb: {
        trustedDevice: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: AuthPrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trustDevice', () => {
    it('should upsert trusted device', async () => {
      const mockDevice = { id: '1', userId: 'user-1', isTrusted: true };
      prismaService.writeDb.trustedDevice.upsert.mockResolvedValue(mockDevice);

      const result = await service.trustDevice(
        'user-1',
        'dev-1',
        'fp-1',
        'My Phone',
      );
      expect(prismaService.writeDb.trustedDevice.upsert).toHaveBeenCalledWith({
        where: {
          userId_deviceFingerprint: {
            userId: 'user-1',
            deviceFingerprint: 'fp-1',
          },
        },
        create: {
          userId: 'user-1',
          deviceId: 'dev-1',
          deviceFingerprint: 'fp-1',
          name: 'My Phone',
          isTrusted: true,
        },
        update: {
          isTrusted: true,
          lastUsedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockDevice);
    });
  });

  describe('untrustDevice', () => {
    it('should set isTrusted false for device', async () => {
      prismaService.writeDb.trustedDevice.updateMany.mockResolvedValue({
        count: 1,
      });
      await service.untrustDevice('user-1', 'fp-1');
      expect(
        prismaService.writeDb.trustedDevice.updateMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1', deviceFingerprint: 'fp-1' },
        data: { isTrusted: false },
      });
    });
  });

  describe('removeDevice', () => {
    it('should delete device record', async () => {
      prismaService.writeDb.trustedDevice.deleteMany.mockResolvedValue({
        count: 1,
      });
      await service.removeDevice('user-1', 'device-id-1');
      expect(
        prismaService.writeDb.trustedDevice.deleteMany,
      ).toHaveBeenCalledWith({
        where: { id: 'device-id-1', userId: 'user-1' },
      });
    });
  });

  describe('getTrustedDevices', () => {
    it('should return trusted devices for user', async () => {
      const mockDevices = [{ id: '1', name: 'MacBook' }];
      prismaService.readDb.trustedDevice.findMany.mockResolvedValue(
        mockDevices,
      );

      const result = await service.getTrustedDevices('user-1');
      expect(result).toEqual(mockDevices);
    });
  });

  describe('isDeviceTrusted', () => {
    it('should return true if device is trusted', async () => {
      prismaService.readDb.trustedDevice.findUnique.mockResolvedValue({
        isTrusted: true,
      });
      const trusted = await service.isDeviceTrusted('user-1', 'fp-1');
      expect(trusted).toBe(true);
    });

    it('should return false if device not found', async () => {
      prismaService.readDb.trustedDevice.findUnique.mockResolvedValue(null);
      const trusted = await service.isDeviceTrusted('user-1', 'fp-1');
      expect(trusted).toBe(false);
    });
  });
});
