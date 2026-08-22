import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { McpGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { AskAgentInput, McpAgentResponse } from './dto/mcp.graphql.types';

@Resolver()
export class McpResolver {
  constructor(private readonly mcpGatewayClient: McpGrpcClient) {}

  @Mutation(() => McpAgentResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_USER_ID })
  askAgent(@Context() ctx: any, @Args('input') input: AskAgentInput) {
    return this.mcpGatewayClient.ask(ctx.req.user.userId, input.prompt);
  }
}
