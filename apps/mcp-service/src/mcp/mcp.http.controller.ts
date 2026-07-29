import { Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpServerService } from './mcp.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('MCP Endpoint')
@Controller('mcp')
export class McpHttpController {
  constructor(private readonly mcpServerService: McpServerService) {}

  @Get()
  async handleSseConnect(@Req() req: any, @Res() res: any) {
    await this.mcpServerService.handleSseConnect(
      req as Request,
      res as Response,
    );
  }

  @Post()
  async handlePostRoot(@Req() req: any, @Res() res: any) {
    await this.mcpServerService.handlePostMessage(
      req as Request,
      res as Response,
    );
  }

  @Post('messages')
  async handlePostMessages(@Req() req: any, @Res() res: any) {
    await this.mcpServerService.handlePostMessage(
      req as Request,
      res as Response,
    );
  }

  @Delete(':sessionId')
  closeSession(@Param('sessionId') sessionId: string, @Res() res: any) {
    this.mcpServerService.closeSession(sessionId);
    (res as Response)
      .status(200)
      .json({ success: true, message: `Session ${sessionId} terminated` });
  }
}
