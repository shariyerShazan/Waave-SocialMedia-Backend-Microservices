import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserClient } from './user.client';
import { MediaEnrichmentService } from '../shared/media-enrichment.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [UserController],
  providers: [UserClient, MediaEnrichmentService],
  exports: [UserClient],
})
export class UserModule {}
