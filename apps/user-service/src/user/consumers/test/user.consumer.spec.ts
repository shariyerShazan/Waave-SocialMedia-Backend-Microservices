import { Test, TestingModule } from '@nestjs/testing';
import { UserConsumer } from '../user.consumer';
import { UserService } from '../../user.service';
import { UserRegisteredEvent } from '@app/kafka/constants/events.type';

describe('UserConsumer', () => {
  let consumer: UserConsumer;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService = {
      createUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserConsumer],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    consumer = module.get<UserConsumer>(UserConsumer);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleUserRegistered', () => {
    it('should delegate to userService.createUser', async () => {
      const eventData: UserRegisteredEvent = {
        userId: 'u1',
        email: 'test@example.com',
        name: 'Test User',
      };

      userService.createUser.mockResolvedValue(undefined);

      await consumer.handleUserRegistered(eventData);

      expect(userService.createUser).toHaveBeenCalledWith(eventData);
    });
  });
});
