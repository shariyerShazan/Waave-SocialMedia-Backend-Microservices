import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  KAFKA_BROKERS,
  KAFKA_CLIENT_IDS,
  KAFKA_CONSUMER_GROUPS,
} from '@app/kafka';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { ChatServiceAppModule } from './app.module';

const httpPort = Number(process.env.CHAT_HTTP_PORT!) || 4005;
const grpcPort = Number(process.env.CHAT_GRPC_PORT!) || 3005;

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceAppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'chat',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/chat.proto'),
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

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENT_IDS.CHAT,
        brokers: [KAFKA_BROKERS],
      },
      consumer: {
        groupId: KAFKA_CONSUMER_GROUPS.CHAT,
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Waave Chat API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();

  await app.listen(httpPort);
  console.log(`🚀 Chat HTTP Server: http://localhost:${httpPort}`);
  console.log(`🚀 Chat Socket.io Server: http://localhost:${httpPort}/chat`);
  console.log(
    `🚀 Chat HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 Chat gRPC Server: 0.0.0.0:${grpcPort}`);
}

void bootstrap();
