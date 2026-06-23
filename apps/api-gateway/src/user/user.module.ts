import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserClient } from './user.client';

@Module({
  controllers: [UserController],
  providers: [UserClient],
})
export class UserModule {}
