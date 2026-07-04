import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  KAFKA_BROKERS,
  KAFKA_CLIENT_IDS,
  KAFKA_CONSUMER_GROUPS,
} from '@app/kafka';
import { NotificationAppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

const httpPort = Number(process.env.NOTIFICATION_HTTP_PORT!) || 4010;
const grpcPort = Number(process.env.NOTIFICATION_GRPC_PORT!) || 3010;

async function bootstrap() {
  const app = await NestFactory.create(NotificationAppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'notification',
      protoPath: join(
        process.cwd(),
        'libs/proto-schema/src/proto/notification.proto',
      ),
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
        clientId: KAFKA_CLIENT_IDS.NOTIFICATION,
        brokers: [KAFKA_BROKERS],
      },
      consumer: {
        groupId: KAFKA_CONSUMER_GROUPS.NOTIFICATION,
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('My Product Notification API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();

  await app.listen(httpPort);
  console.log(`🚀 Notification HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 Notification HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 Notification gRPC Server: 0.0.0.0:${grpcPort}`);
}

void bootstrap();
