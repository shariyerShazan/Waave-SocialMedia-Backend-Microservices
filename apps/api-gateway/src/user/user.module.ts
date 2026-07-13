import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserClient } from './user.client';
import { EnrichmentService } from '../enrichments/enrichment.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [UserController],
  providers: [UserClient, EnrichmentService],
  exports: [UserClient],
})
export class UserModule {}
