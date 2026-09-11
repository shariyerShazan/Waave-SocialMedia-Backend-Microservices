import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from '../mfa.service';
import { AuthPrismaService } from '../../../prisma/prisma.service';

describe('MfaService', () => {
  let service: MfaService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      writeDb: {
        twoFactorAuth: {
          upsert: jest.fn(),
          deleteMany: jest.fn(),
        },
        recoveryCode: {
          deleteMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      },
      readDb: {
        twoFactorAuth: {
          findUnique: jest.fn(),
        },
        recoveryCode: {
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: AuthPrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMfaSecret', () => {
    it('should generate a 16-character base32 secret and valid otpauth URL', () => {
      const result = service.generateMfaSecret('test@example.com');
      expect(result.secret).toHaveLength(16);
      expect(result.otpAuthUrl).toContain(
        'otpauth://totp/Waave:test@example.com',
      );
    });
  });

  describe('verifyTotpCode', () => {
    it('should correctly verify valid TOTP code for generated secret', () => {
      const { secret } = service.generateMfaSecret('test@example.com');
      const counter = Math.floor(Date.now() / 1000 / 30);
      const validCode = (service as any).generateHotp(secret, counter);

      expect(service.verifyTotpCode(secret, validCode)).toBe(true);
    });

    it('should return false for invalid TOTP code', () => {
      const { secret } = service.generateMfaSecret('test@example.com');
      expect(service.verifyTotpCode(secret, '000000')).toBe(false);
    });
  });

  describe('enableMfa', () => {
    it('should return null if code is invalid', async () => {
      const result = await service.enableMfa(
        'user-1',
        'INVALIDSECRET',
        '000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('disableMfa', () => {
    it('should remove twoFactorAuth and recoveryCode records', async () => {
      prismaService.writeDb.twoFactorAuth.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.writeDb.recoveryCode.deleteMany.mockResolvedValue({
        count: 8,
      });

      await service.disableMfa('user-1');
      expect(
        prismaService.writeDb.twoFactorAuth.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(
        prismaService.writeDb.recoveryCode.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
