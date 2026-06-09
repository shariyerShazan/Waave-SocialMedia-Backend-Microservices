import { Module } from '@nestjs/common';
import { AuthPrismaService } from './auth-prisma.service';

@Module({
  providers: [AuthPrismaService],
  exports: [AuthPrismaService],
})
export class PrismaModule {}
