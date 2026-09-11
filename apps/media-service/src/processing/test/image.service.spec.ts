import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageService } from '../image.service';
import sharp from 'sharp';

jest.mock('sharp');

describe('ImageService', () => {
  let service: ImageService;
  let mockSharp: any;

  beforeEach(async () => {
    mockSharp = {
      metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
      rotate: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
    };

    (sharp as unknown as jest.Mock).mockImplementation(() => mockSharp);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageService],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should throw BadRequestException if mimeType is unsupported', async () => {
      await expect(
        service.validate(Buffer.from('test'), 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if metadata dimensions missing', async () => {
      mockSharp.metadata.mockResolvedValue({});

      await expect(
        service.validate(Buffer.from('test'), 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dimensions too small', async () => {
      mockSharp.metadata.mockResolvedValue({ width: 5, height: 5 });

      await expect(
        service.validate(Buffer.from('test'), 'image/png'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass validation for valid image', async () => {
      mockSharp.metadata.mockResolvedValue({ width: 100, height: 100 });

      await expect(
        service.validate(Buffer.from('test'), 'image/webp'),
      ).resolves.not.toThrow();
    });
  });

  describe('process', () => {
    it('should process image into original, medium, thumbnail variants', async () => {
      const buffer = Buffer.from('raw-image');
      const result = await service.process(buffer);

      expect(result.original).toBeDefined();
      expect(result.medium).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
    });
  });

  describe('processAvatar and processCover', () => {
    it('should process avatar image buffer', async () => {
      const res = await service.processAvatar(Buffer.from('avatar'));
      expect(res).toBeDefined();
      expect(mockSharp.resize).toHaveBeenCalledWith(400, 400, {
        fit: 'cover',
      });
    });

    it('should process cover image buffer', async () => {
      const res = await service.processCover(Buffer.from('cover'));
      expect(res).toBeDefined();
      expect(mockSharp.resize).toHaveBeenCalledWith(1200, 400, {
        fit: 'cover',
      });
    });
  });
});
