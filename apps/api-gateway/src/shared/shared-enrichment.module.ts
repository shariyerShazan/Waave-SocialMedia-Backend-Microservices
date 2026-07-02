import { Module } from '@nestjs/common';
import { MediaEnrichmentService } from './media-enrichment.service';
import { MediaClient } from '../media/media.client';

@Module({
  providers: [MediaEnrichmentService, MediaClient],
  exports: [MediaEnrichmentService],
})
export class SharedEnrichmentModule {}
