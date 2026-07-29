import { Module } from '@nestjs/common';
import { McpHttpController } from './mcp.http.controller';
import { AgentGrpcController } from './agent/agent.grpc.controller';
import { McpServerService } from './mcp.service';
import { AgentService } from './agent/agent.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [McpHttpController, AgentGrpcController],
  providers: [McpServerService, AgentService],
  exports: [McpServerService, AgentService],
})
export class McpModule {}
