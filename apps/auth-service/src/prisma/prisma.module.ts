import { Module } from '@nestjs/common';
import { AuthPrismaService } from './prisma.service';

@Module({
  providers: [AuthPrismaService],
  exports: [AuthPrismaService],
})
export class AuthPrismaModule {}
