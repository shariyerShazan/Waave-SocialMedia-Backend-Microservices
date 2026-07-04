import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/post-client';

@Injectable()
export class PostPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  [x: string]: any;
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.POST_DB_PRIMARY_URL!,
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
    console.log('User Prisma connected');
  }
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('User Prisma disconnected');
  }
}
