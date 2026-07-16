import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserClient } from './user.client';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [UserController],
  providers: [UserClient],
  exports: [UserClient],
})
export class UserModule {}
