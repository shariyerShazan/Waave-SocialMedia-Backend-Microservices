import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [McpController],
  providers: [RateLimiterService],
})
export class McpGatewayModule {}
