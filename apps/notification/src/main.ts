import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import {
  KAFKA_BROKERS,
  KAFKA_CLIENT_IDS,
  KAFKA_CONSUMER_GROUPS,
} from '@app/kafka';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const httpPort = Number(process.env.NOTIFICATION_HTTP_PORT!) || 4010;
  await app.listen(httpPort);
  console.log(`🚀 Notification HTTP Server: http://localhost:${httpPort}`);
}

void bootstrap();
