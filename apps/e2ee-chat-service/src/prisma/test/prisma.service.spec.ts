import { Test, TestingModule } from '@nestjs/testing';
import { E2eeChatPrismaService } from '../prisma.service';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@prisma/e2ee-chat-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('E2eeChatPrismaService', () => {
  let service: E2eeChatPrismaService;

  beforeEach(async () => {
    process.env.E2EE_CHAT_DB_PRIMARY_URL =
      'postgresql://user:pass@localhost:5432/primary';
    process.env.E2EE_CHAT_DB_REPLICA_URL =
      'postgresql://user:pass@localhost:5432/replica';

    const module: TestingModule = await Test.createTestingModule({
      providers: [E2eeChatPrismaService],
    }).compile();

    service = module.get<E2eeChatPrismaService>(E2eeChatPrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.writeDb).toBeDefined();
    expect(service.readDb).toBeDefined();
  });

  it('onModuleInit should connect write and read databases', async () => {
    await service.onModuleInit();
    expect(service.writeDb.$connect).toHaveBeenCalled();
    expect(service.readDb.$connect).toHaveBeenCalled();
  });

  it('onModuleDestroy should disconnect write and read databases', async () => {
    await service.onModuleDestroy();
    expect(service.writeDb.$disconnect).toHaveBeenCalled();
    expect(service.readDb.$disconnect).toHaveBeenCalled();
  });
});
