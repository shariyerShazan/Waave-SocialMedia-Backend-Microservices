import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class McpAgentResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  response?: string;
}

@InputType()
export class AskAgentInput {
  @Field()
  prompt!: string;
}
