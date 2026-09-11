import { Test, TestingModule } from '@nestjs/testing';
import { E2eeKeysHttpController } from '../e2ee-keys.http.controller';
import { E2eeKeysService } from '../e2ee-keys.service';

describe('E2eeKeysHttpController', () => {
  let controller: E2eeKeysHttpController;
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
      countOneTimePreKeys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2eeKeysHttpController],
      providers: [{ provide: E2eeKeysService, useValue: mockKeysService }],
    }).compile();

    controller = module.get<E2eeKeysHttpController>(E2eeKeysHttpController);
    keysService = module.get(E2eeKeysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should call keys.registerDevice', async () => {
      const dto = { deviceId: 'd1', deviceName: 'Phone', platform: 'IOS' };
      keysService.registerDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.registerDevice('u1', dto as any);
      expect(keysService.registerDevice).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('listDevices', () => {
    it('should call keys.listDevices', async () => {
      keysService.listDevices.mockResolvedValue({
        success: true,
        devices: [],
      });

      const res = await controller.listDevices('u1');
      expect(keysService.listDevices).toHaveBeenCalledWith('u1');
      expect(res.success).toBe(true);
    });
  });

  describe('revokeDevice', () => {
    it('should call keys.revokeDevice', async () => {
      keysService.revokeDevice.mockResolvedValue({ success: true } as any);

      const res = await controller.revokeDevice('u1', 'd1');
      expect(keysService.revokeDevice).toHaveBeenCalledWith('u1', 'd1');
      expect(res.success).toBe(true);
    });
  });

  describe('uploadKeys', () => {
    it('should call keys.uploadKeys', async () => {
      const dto = {
        deviceId: 'd1',
        identityKey: { publicKey: 'ik', registrationId: 1 },
        signedPreKey: { keyId: 1, publicKey: 'spk', signature: 'sig' },
        oneTimePreKeys: [{ keyId: 1, publicKey: 'otk' }],
      };
      keysService.uploadKeys.mockResolvedValue({ success: true } as any);

      const res = await controller.uploadKeys('u1', dto);
      expect(keysService.uploadKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('rotateSignedPreKey', () => {
    it('should call keys.rotateSignedPreKey', async () => {
      const dto = {
        deviceId: 'd1',
        signedPreKey: { keyId: 2, publicKey: 'spk2', signature: 'sig2' },
      };
      keysService.rotateSignedPreKey.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.rotateSignedPreKey('u1', dto);
      expect(keysService.rotateSignedPreKey).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('refill', () => {
    it('should call keys.refillOneTimePreKeys', async () => {
      const dto = {
        deviceId: 'd1',
        oneTimePreKeys: [{ keyId: 2, publicKey: 'otk2' }],
      };
      keysService.refillOneTimePreKeys.mockResolvedValue({
        success: true,
      } as any);

      const res = await controller.refill('u1', dto);
      expect(keysService.refillOneTimePreKeys).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('getKeyBundle', () => {
    it('should call keys.getKeyBundle', async () => {
      keysService.getKeyBundle.mockResolvedValue({
        success: true,
        devices: [],
      } as any);

      const res = await controller.getKeyBundle('target-1', 'req-1', 'dev-1');
      expect(keysService.getKeyBundle).toHaveBeenCalledWith(
        'target-1',
        'req-1',
        'dev-1',
      );
      expect(res.success).toBe(true);
    });
  });

  describe('countOtk', () => {
    it('should call keys.countOneTimePreKeys', async () => {
      keysService.countOneTimePreKeys.mockResolvedValue({
        success: true,
        count: 5,
        needsRefill: true,
      });

      const res = await controller.countOtk('u1', 'd1');
      expect(keysService.countOneTimePreKeys).toHaveBeenCalledWith('u1', 'd1');
      expect(res.count).toBe(5);
    });
  });
});
