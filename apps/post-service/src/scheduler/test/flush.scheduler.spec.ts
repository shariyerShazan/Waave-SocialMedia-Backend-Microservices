import { Test, TestingModule } from '@nestjs/testing';
import { FlushScheduler } from '../flush.scheduler';
import { PostService } from '../../post/post.service';

describe('FlushScheduler', () => {
  let scheduler: FlushScheduler;
  let postService: jest.Mocked<PostService>;

  beforeEach(async () => {
    const mockPostService = {
      flushCountsToDB: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlushScheduler,
        { provide: PostService, useValue: mockPostService },
      ],
    }).compile();

    scheduler = module.get<FlushScheduler>(FlushScheduler);
    postService = module.get(PostService);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('flushCounts', () => {
    it('should delegate to postService.flushCountsToDB', async () => {
      postService.flushCountsToDB.mockResolvedValue(undefined);

      await scheduler.flushCounts();

      expect(postService.flushCountsToDB).toHaveBeenCalled();
    });
  });
});
