import { Test, TestingModule } from '@nestjs/testing';
import { E2eeKeysGrpcController } from '../e2ee-keys.grpc.controller';
import { E2eeKeysService } from '../e2ee-keys.service';

describe('E2eeKeysGrpcController', () => {
  let controller: E2eeKeysGrpcController;
  let keysService: jest.Mocked<E2eeKeysService>;

  beforeEach(async () => {
    const mockKeysService = {
      registerDevice: jest.fn(),
      listDevices: jest.fn(),
      revokeDevice: jest.fn(),
      uploadKeys: jest.fn(),
      rotateSignedPreKey: jest.fn(),
      refillOneTimePreKeys: jest.fn(),
      getKeyBundle: jest.fn(),
      getKeyBundlesForUsers: jest.fn(),
      countOneTimePreKeys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2eeKeysGrpcController],
      providers: [{ provide: E2eeKeysService, useValue: mockKeysService }],
    }).compile();

    controller = module.get<E2eeKeysGrpcController>(E2eeKeysGrpcController);
    keysService = module.get(E2eeKeysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should delegate to keysService.registerDevice', async () => {
      const data = {
        userId: 'u1',
        deviceId: 'd1',
        deviceName: 'Phone',
        platform: 'IOS',
      };
      keysService.registerDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.registerDevice(data);
      expect(keysService.registerDevice).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });
  });

  describe('listDevices', () => {
    it('should delegate to keysService.listDevices', async () => {
      keysService.listDevices.mockResolvedValue({
        success: true,
        devices: [],
      });

      const res = await controller.listDevices({ userId: 'u1' });
      expect(keysService.listDevices).toHaveBeenCalledWith('u1');
      expect(res.success).toBe(true);
    });
  });

  describe('revokeDevice', () => {
    it('should delegate to keysService.revokeDevice', async () => {
      keysService.revokeDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.revokeDevice({
        userId: 'u1',
        deviceId: 'd1',
      });
      expect(keysService.revokeDevice).toHaveBeenCalledWith('u1', 'd1');
      expect(res.success).toBe(true);
    });
  });

  describe('uploadKeys', () => {
    it('should delegate to keysService.uploadKeys', async () => {
      const data = {
        userId: 'u1',
        deviceId: 'd1',
        identityKey: { publicKey: 'ik', registrationId: 1 },
        signedPreKey: { keyId: 1, publicKey: 'spk', signature: 'sig' },
        oneTimePreKeys: [{ keyId: 1, publicKey: 'otk' }],
      };
      keysService.uploadKeys.mockResolvedValue({ success: true } as any);

      const res = await controller.uploadKeys(data);
      expect(keysService.uploadKeys).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });
  });

  describe('rotateSignedPreKey', () => {
    it('should delegate to keysService.rotateSignedPreKey', async () => {
      const data = {
        userId: 'u1',
        deviceId: 'd1',
        signedPreKey: { keyId: 2, publicKey: 'spk2', signature: 'sig2' },
      };
      keysService.rotateSignedPreKey.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.rotateSignedPreKey(data);
      expect(keysService.rotateSignedPreKey).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });
  });

  describe('refillOneTimePreKeys', () => {
    it('should delegate to keysService.refillOneTimePreKeys', async () => {
      const data = {
        userId: 'u1',
        deviceId: 'd1',
        oneTimePreKeys: [{ keyId: 2, publicKey: 'otk2' }],
      };
      keysService.refillOneTimePreKeys.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.refillOneTimePreKeys(data);
      expect(keysService.refillOneTimePreKeys).toHaveBeenCalledWith(data);
      expect(res.success).toBe(true);
    });
  });

  describe('getKeyBundle', () => {
    it('should delegate to keysService.getKeyBundle', async () => {
      const data = { targetUserId: 'u2', requesterId: 'u1', deviceId: 'd1' };
      keysService.getKeyBundle.mockResolvedValue({ success: true } as any);

      const res = await controller.getKeyBundle(data);
      expect(keysService.getKeyBundle).toHaveBeenCalledWith('u2', 'u1', 'd1');
      expect(res.success).toBe(true);
    });
  });

  describe('getKeyBundlesForUsers', () => {
    it('should delegate to keysService.getKeyBundlesForUsers', async () => {
      const data = { userIds: ['u2', 'u3'], requesterId: 'u1' };
      keysService.getKeyBundlesForUsers.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.getKeyBundlesForUsers(data);
      expect(keysService.getKeyBundlesForUsers).toHaveBeenCalledWith(
        ['u2', 'u3'],
        'u1',
      );
      expect(res.success).toBe(true);
    });
  });

  describe('countOneTimePreKeys', () => {
    it('should delegate to keysService.countOneTimePreKeys', async () => {
      const data = { userId: 'u1', deviceId: 'd1' };
      keysService.countOneTimePreKeys.mockResolvedValue({
        success: true,
        count: 15,
        needsRefill: true,
      });

      const res = await controller.countOneTimePreKeys(data);
      expect(keysService.countOneTimePreKeys).toHaveBeenCalledWith('u1', 'd1');
      expect(res.count).toBe(15);
    });
  });
});
