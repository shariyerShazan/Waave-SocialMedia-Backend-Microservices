import { Module } from '@nestjs/common';
import { UserPrismaModule } from '../prisma/prisma.module';
import { E2eeKeysService } from './e2ee-keys.service';
import { E2eeKeysGrpcController } from './e2ee-keys.grpc.controller';
import { E2eeKeysHttpController } from './e2ee-keys.http.controller';

@Module({
  imports: [UserPrismaModule],
  controllers: [E2eeKeysGrpcController, E2eeKeysHttpController],
  providers: [E2eeKeysService],
  exports: [E2eeKeysService],
})
export class E2eeKeysModule {}
