import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from '../LocalStorageService';
import { promises as fs, existsSync, createReadStream } from 'fs';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-v4' }));

jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Readable } = require('stream');
  return {
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    },
    existsSync: jest.fn().mockReturnValue(true),
    createReadStream: jest.fn().mockReturnValue(new Readable()),
  };
});

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create default storage folders', async () => {
      await service.onModuleInit();
      expect(fs.mkdir).toHaveBeenCalledTimes(5);
    });
  });

  describe('saveFile', () => {
    it('should create directories and write file buffer', async () => {
      const res = await service.saveFile({
        folder: 'images',
        userId: 'u1',
        variant: 'original',
        extension: 'png',
        buffer: Buffer.from('test'),
      });

      expect(res.fileName).toMatch(/\.png$/);
      expect(res.relativePath).toContain('images/u1/original/');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle undefined optional values safely', async () => {
      const res = await service.saveFile({
        extension: undefined as any,
        folder: undefined as any,
        userId: undefined as any,
        variant: undefined as any,
        buffer: Buffer.from('test'),
      });

      expect(res.fileName).toMatch(/\.bin$/);
      expect(res.relativePath).toContain('images/unknown/original/');
    });
  });

  describe('deleteFile', () => {
    it('should unlink file if it exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      await service.deleteFile('images/u1/test.png');
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should not unlink file if it does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      await service.deleteFile('images/u1/test.png');
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('exists, createReadStream, getAbsolutePath, getPublicUrl', () => {
    it('should return boolean for exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      const res = await service.exists('test.png');
      expect(res).toBe(true);
    });

    it('should call createReadStream', () => {
      const stream = service.createReadStream('test.png');
      expect(stream).toBeDefined();
      expect(createReadStream).toHaveBeenCalled();
    });

    it('should return public url', () => {
      const url = service.getPublicUrl('images/u1/test.png');
      expect(url).toBe('http://localhost:4009/media/images/u1/test.png');
    });

    it('should return absolute path', () => {
      const path = service.getAbsolutePath('images/u1/test.png');
      expect(path).toContain('images/u1/test.png');
    });
  });
});
