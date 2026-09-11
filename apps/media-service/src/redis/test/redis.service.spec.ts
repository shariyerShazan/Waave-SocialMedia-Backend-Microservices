import { Test, TestingModule } from '@nestjs/testing';
import { MediaRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('MediaRedisService', () => {
  let service: MediaRedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaRedisService],
    }).compile();

    service = module.get<MediaRedisService>(MediaRedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleDestroy', () => {
    it('should call quit on redis client', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('setMedia', () => {
    it('should set media with default ttl', async () => {
      const data = { id: 'm1', url: 'test.jpg' };
      await service.setMedia('m1', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'media:m1',
        JSON.stringify(data),
        'EX',
        3600,
      );
    });

    it('should set media with custom ttl', async () => {
      const data = { id: 'm1' };
      await service.setMedia('m1', data, 600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'media:m1',
        JSON.stringify(data),
        'EX',
        600,
      );
    });
  });

  describe('getMedia', () => {
    it('should return parsed json if media exists', async () => {
      const data = { id: 'm1', name: 'media1' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

      const res = await service.getMedia('m1');
      expect(res).toEqual(data);
      expect(mockRedisClient.get).toHaveBeenCalledWith('media:m1');
    });

    it('should return null if media does not exist in redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const res = await service.getMedia('m1');
      expect(res).toBeNull();
    });
  });

  describe('deleteMedia and deleteMany', () => {
    it('should delete single media key', async () => {
      await service.deleteMedia('m1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('media:m1');
    });

    it('should do nothing if empty array passed to deleteMany', async () => {
      await service.deleteMany([]);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should delete multiple media keys', async () => {
      await service.deleteMany(['m1', 'm2']);
      expect(mockRedisClient.del).toHaveBeenCalledWith('media:m1', 'media:m2');
    });
  });
});
