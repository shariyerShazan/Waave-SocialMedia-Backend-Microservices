import { Module } from '@nestjs/common';
import { PostPrismaService } from './prisma.service';

@Module({
  providers: [PostPrismaService],
  exports: [PostPrismaService],
})
export class PostPrismaModule {}
