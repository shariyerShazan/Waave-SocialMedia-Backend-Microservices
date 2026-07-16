import { KAFKA_TOPICS } from '@app/kafka';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from '../user.service';
import type { UserRegisteredEvent } from '@app/kafka/constants/events.type';

@Controller()
export class UserConsumer {
  constructor(private readonly userService: UserService) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(
    @Payload()
    data: UserRegisteredEvent,
  ) {
    await this.userService.createUser(data);
  }
}
