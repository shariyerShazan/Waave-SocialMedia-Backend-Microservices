import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpResolver } from './mcp.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [McpController],
  providers: [McpResolver, RateLimiterService, RateLimitGuard],
})
export class McpGatewayModule {}
