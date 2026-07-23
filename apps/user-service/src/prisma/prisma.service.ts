import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/user-client';

@Injectable()
export class UserPrismaService implements OnModuleInit, OnModuleDestroy {
  readonly writeDb: PrismaClient;
  readonly readDb: PrismaClient;
  constructor() {
    this.writeDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.USER_DB_PRIMARY_URL!,
      }),
    });

    this.readDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.USER_DB_REPLICA_URL!,
      }),
    });
  }
  async onModuleInit() {
    await Promise.all([this.readDb.$connect(), this.writeDb.$connect()]);
    console.log('User Prisma connected');
  }
  async onModuleDestroy() {
    await Promise.all([this.readDb.$disconnect(), this.writeDb.$disconnect()]);
    console.log('User Prisma disconnected');
  }
}
