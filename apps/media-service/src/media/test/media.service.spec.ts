import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaService } from '../media.service';
import { Media } from '../../schemas/media.schema';
import { StorageService } from '../../storage/storage.service';
import { ImageService } from '../../processing/image.service';
import { MediaRedisService } from '../../redis/redis.service';

describe('MediaService', () => {
  let service: MediaService;
  let mediaModel: any;
  let storage: any;
  let imageService: any;
  let redis: any;

  beforeEach(async () => {
    mediaModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
    };

    storage = {
      saveFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    imageService = {
      validate: jest.fn().mockResolvedValue(undefined),
      process: jest.fn().mockResolvedValue({
        original: Buffer.from('orig'),
        medium: Buffer.from('med'),
        thumbnail: Buffer.from('thumb'),
        width: 800,
        height: 600,
        size: 100,
        extension: 'webp',
        mimeType: 'image/webp',
      }),
    };

    redis = {
      setMedia: jest.fn().mockResolvedValue(undefined),
      getMedia: jest.fn().mockResolvedValue(null),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getModelToken(Media.name), useValue: mediaModel },
        { provide: StorageService, useValue: storage },
        { provide: ImageService, useValue: imageService },
        { provide: MediaRedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should throw BadRequestException if userId is empty', async () => {
      await expect(
        service.uploadImage('', Buffer.from('img'), 'test.png', 'image/png'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload image, save variants to storage, create DB entry and cache in redis', async () => {
      storage.saveFile
        .mockResolvedValueOnce({
          fileName: 'orig.webp',
          relativePath: 'images/u1/original/orig.webp',
          absolutePath: '/storage/images/u1/original/orig.webp',
        })
        .mockResolvedValueOnce({
          fileName: 'med.webp',
          relativePath: 'images/u1/medium/med.webp',
          absolutePath: '/storage/images/u1/medium/med.webp',
        })
        .mockResolvedValueOnce({
          fileName: 'thumb.webp',
          relativePath: 'images/u1/thumbnail/thumb.webp',
          absolutePath: '/storage/images/u1/thumbnail/thumb.webp',
        });

      const mockMediaDocument = {
        id: 'm1',
        _id: 'm1',
        toObject: jest
          .fn()
          .mockReturnValue({ id: 'm1', path: 'images/u1/original/orig.webp' }),
      };
      mediaModel.create.mockResolvedValue(mockMediaDocument);

      const res = await service.uploadImage(
        'u1',
        Buffer.from('img'),
        'test.png',
        'image/png',
      );

      expect(res.success).toBe(true);
      expect(imageService.validate).toHaveBeenCalled();
      expect(imageService.process).toHaveBeenCalled();
      expect(storage.saveFile).toHaveBeenCalledTimes(3);
      expect(mediaModel.create).toHaveBeenCalled();
      expect(redis.setMedia).toHaveBeenCalledWith('m1', expect.any(Object));
    });

    it('should clean up saved files if DB creation fails', async () => {
      storage.saveFile
        .mockResolvedValueOnce({
          fileName: 'orig.webp',
          relativePath: 'images/u1/original/orig.webp',
          absolutePath: '/storage/images/u1/original/orig.webp',
        })
        .mockResolvedValueOnce({
          fileName: 'med.webp',
          relativePath: 'images/u1/medium/med.webp',
          absolutePath: '/storage/images/u1/medium/med.webp',
        })
        .mockResolvedValueOnce({
          fileName: 'thumb.webp',
          relativePath: 'images/u1/thumbnail/thumb.webp',
          absolutePath: '/storage/images/u1/thumbnail/thumb.webp',
        });

      mediaModel.create.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.uploadImage('u1', Buffer.from('img'), 'test.png', 'image/png'),
      ).rejects.toThrow('DB Error');

      expect(storage.deleteFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('createMedia', () => {
    it('should create media document and set redis cache', async () => {
      const mockMediaDocument = {
        id: 'm1',
        toObject: jest.fn().mockReturnValue({ id: 'm1', type: 'IMAGE' }),
      };
      mediaModel.create.mockResolvedValue(mockMediaDocument);

      const res = await service.createMedia({
        userId: 'u1',
        type: 1, // IMAGE
        status: 3, // DONE
      } as any);

      expect(res.success).toBe(true);
      expect(redis.setMedia).toHaveBeenCalledWith('m1', expect.any(Object));
    });
  });

  describe('getMedia', () => {
    it('should return cached media if available in redis', async () => {
      redis.getMedia.mockResolvedValue({ id: 'm1', path: 'test.webp' });

      const res = await service.getMedia('m1');
      expect(res.success).toBe(true);
      expect(res.media).toEqual({ id: 'm1', path: 'test.webp' });
      expect(mediaModel.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if media not found in DB', async () => {
      redis.getMedia.mockResolvedValue(null);
      mediaModel.findById.mockResolvedValue(null);

      await expect(service.getMedia('m1')).rejects.toThrow(NotFoundException);
    });

    it('should fetch from DB and cache in redis', async () => {
      redis.getMedia.mockResolvedValue(null);
      const mockDoc = {
        id: 'm1',
        toObject: jest.fn().mockReturnValue({ id: 'm1', path: 'test.webp' }),
      };
      mediaModel.findById.mockResolvedValue(mockDoc);

      const res = await service.getMedia('m1');
      expect(res.success).toBe(true);
      expect(redis.setMedia).toHaveBeenCalledWith('m1', expect.any(Object));
    });
  });

  describe('listUserMedia', () => {
    it('should return paginated user media', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1' }]),
      };
      mediaModel.find.mockReturnValue(chain);
      mediaModel.countDocuments.mockResolvedValue(1);

      const res = await service.listUserMedia('u1', 'IMAGE', 1, 10);

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.media).toHaveLength(1);
    });
  });

  describe('deleteMedia', () => {
    it('should throw NotFoundException if media not found', async () => {
      mediaModel.findOne.mockResolvedValue(null);

      await expect(service.deleteMedia('m1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft delete media and clear redis cache', async () => {
      const mockDoc = {
        id: 'm1',
        isDeleted: false,
        deletedAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mediaModel.findOne.mockResolvedValue(mockDoc);

      const res = await service.deleteMedia('m1', 'u1');

      expect(res.success).toBe(true);
      expect(mockDoc.isDeleted).toBe(true);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(redis.deleteMedia).toHaveBeenCalledWith('m1');
    });
  });

  describe('exists', () => {
    it('should return exists boolean status', async () => {
      mediaModel.exists.mockResolvedValue({ _id: 'm1' });

      const res = await service.exists('m1');
      expect(res.success).toBe(true);
      expect(res.exists).toBe(true);
    });
  });

  describe('updateMediaStatus', () => {
    it('should throw NotFoundException if media does not exist', async () => {
      mediaModel.findById.mockResolvedValue(null);

      await expect(
        service.updateMediaStatus({ mediaId: 'm1', status: 'DONE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update media status and delete redis cache', async () => {
      const mockDoc = {
        id: 'm1',
        status: 'PENDING',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mediaModel.findById.mockResolvedValue(mockDoc);

      const res = await service.updateMediaStatus({
        mediaId: 'm1',
        status: 'DONE',
      });

      expect(res.success).toBe(true);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(redis.deleteMedia).toHaveBeenCalledWith('m1');
    });
  });

  describe('getMediaByPath and getMediaByIds', () => {
    it('should throw NotFoundException if getMediaByPath finds nothing', async () => {
      mediaModel.findOne.mockResolvedValue(null);

      await expect(service.getMediaByPath('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should get media by path', async () => {
      const mockDoc = {
        id: 'm1',
        toObject: jest.fn().mockReturnValue({ id: 'm1', path: 'path.webp' }),
      };
      mediaModel.findOne.mockResolvedValue(mockDoc);

      const res = await service.getMediaByPath('path.webp');
      expect(res.success).toBe(true);
    });

    it('should return empty list if empty array passed to getMediaByIds', async () => {
      const res = await service.getMediaByIds([]);
      expect(res.media).toEqual([]);
    });

    it('should combine redis cached and db fetched media in getMediaByIds', async () => {
      redis.getMedia
        .mockResolvedValueOnce({ id: 'm1', path: 'p1' })
        .mockResolvedValueOnce(null);

      const mockDbDoc = {
        id: 'm2',
        toObject: jest.fn().mockReturnValue({ id: 'm2', path: 'p2' }),
      };
      mediaModel.find.mockResolvedValue([mockDbDoc]);

      const res = await service.getMediaByIds(['m1', 'm2']);
      expect(res.success).toBe(true);
      expect(res.media).toHaveLength(2);
    });
  });
});
