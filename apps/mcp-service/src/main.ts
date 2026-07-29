import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { McpAppModule } from './app.module';

const grpcPort = Number(process.env.MCP_GRPC_PORT) || 3011;
const httpPort = Number(process.env.MCP_HTTP_PORT) || 4011;

async function bootstrap() {
  const app = await NestFactory.create(McpAppModule, {
    bodyParser: false,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'mcp',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/mcp.proto'),
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  app.useGlobalFilters(new GrpcExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Waave MCP Service API')
    .setDescription('Model Context Protocol & AI Agent Microservice')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(httpPort);

  console.log(`🚀 MCP HTTP Server & SSE: http://localhost:${httpPort}/mcp`);
  console.log(
    `🚀 MCP HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 MCP gRPC Server: 0.0.0.0:${grpcPort}`);
}
void bootstrap();
