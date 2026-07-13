import { Module } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';
import { MediaClient } from '../media/media.client';

@Module({
  providers: [EnrichmentService, MediaClient],
  exports: [EnrichmentService],
})
export class SharedEnrichmentModule {}
