import { Module } from '@nestjs/common';
import { EnrichmentService } from '../shared/enrichment.service';
import { MediaModule } from '../media/media.module';
import { PostClient } from './post.clinet';
import { PostController } from './post.controller';

@Module({
  imports: [MediaModule],
  controllers: [PostController],
  providers: [PostClient, EnrichmentService],
  exports: [PostClient],
})
export class PostModule {}
