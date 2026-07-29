import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AskAgentDto {
  @ApiProperty({
    description: 'Prompt or task description for the MCP AI agent',
    example: 'What posts are trending right now?',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
