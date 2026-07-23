import { Module } from '@nestjs/common';
import { E2eeChatPrismaService } from './prisma.service';

@Module({
  providers: [E2eeChatPrismaService],
  exports: [E2eeChatPrismaService],
})
export class E2eeChatPrismaModule {}
