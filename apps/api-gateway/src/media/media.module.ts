import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';
@Module({
  providers: [RateLimiterService],
  imports: [GrpcClientsModule],
  controllers: [MediaController],
})
export class MediaModule {}
