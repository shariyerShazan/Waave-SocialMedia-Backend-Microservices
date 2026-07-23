import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/auth-client';

@Injectable()
export class E2eeChatPrismaService implements OnModuleInit, OnModuleDestroy {
  readonly writeDb: PrismaClient;
  readonly readDb: PrismaClient;
  constructor() {
    this.writeDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.E2EE_CHAT_DB_PRIMARY_URL!,
      }),
    });

    this.readDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.E2EE_CHAT_DB_REPLICA_URL!,
      }),
    });
  }

  async onModuleInit() {
    await Promise.all([this.writeDb.$connect(), this.readDb.$connect()]);

    console.log('Auth Prisma connected');
  }

  async onModuleDestroy() {
    await Promise.all([this.writeDb.$disconnect(), this.readDb.$disconnect()]);

    console.log('Auth Prisma disconnected');
  }
}
