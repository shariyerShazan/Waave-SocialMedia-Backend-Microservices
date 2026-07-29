import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AgentService } from './agent.service';
import type {
  AskRequest,
  AskResponse,
} from '@app/proto-schema/protos-types/mcp';

@Controller()
export class AgentGrpcController {
  constructor(private readonly agentService: AgentService) {}

  @GrpcMethod('AgentService', 'Ask')
  async ask(data: AskRequest): Promise<AskResponse> {
    return this.agentService.ask(data.userId, data.prompt);
  }
}
