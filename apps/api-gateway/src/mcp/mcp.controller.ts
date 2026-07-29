import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { McpGrpcClient } from 'libs/grpc-clients/src';
import { AskAgentDto } from './dto/ask-agent.dto';
import * as Express from 'express';

@ApiTags('MCP Agent')
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpGatewayClient: McpGrpcClient) {}

  @Post('ask')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  async ask(@Req() req: Express.Request, @Body() dto: AskAgentDto) {
    return this.mcpGatewayClient.ask(req.user.userId, dto.prompt);
  }
}
