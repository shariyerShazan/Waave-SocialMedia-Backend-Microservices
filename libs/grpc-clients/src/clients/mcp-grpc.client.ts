/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  AgentServiceClient,
  AGENT_SERVICE_NAME,
} from '@app/proto-schema/protos-types/mcp';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class McpGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'mcp',
      protoPath: join(
        __dirname,
        '../../../libs/proto-schema/src/proto/mcp.proto',
      ),
      url: process.env.MCP_SERVICE_GRPC_URL || 'localhost:3011',
    },
  })
  private client: ClientGrpc;
  private mcpService: AgentServiceClient;

  onModuleInit() {
    this.mcpService =
      this.client.getService<AgentServiceClient>(AGENT_SERVICE_NAME);
  }

  private handleError(err: any): never {
    const message = err?.message ?? err?.details ?? 'MCP Service error';
    throw new HttpException(
      {
        success: false,
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async ask(userId: string, prompt: string) {
    try {
      return await firstValueFrom(this.mcpService.ask({ userId, prompt }));
    } catch (err) {
      this.handleError(err);
    }
  }
}
