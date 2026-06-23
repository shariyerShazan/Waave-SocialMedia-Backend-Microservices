import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthClient } from './auth.clinet';

@Module({
  controllers: [AuthController],
  providers: [AuthClient],
})
export class AuthModule {}
