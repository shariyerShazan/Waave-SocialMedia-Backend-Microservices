import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import {
  KAFKA_BROKERS,
  KAFKA_CLIENT_IDS,
  KAFKA_CONSUMER_GROUPS,
} from '@app/kafka';
import { UserAppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const grpcPort = Number(process.env.USER_GRPC_PORT) || 3002;
const httpPort = Number(process.env.USER_HTTP_PORT) || 4002;
async function bootstrap() {
  const app = await NestFactory.create(UserAppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/user.proto'),
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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENT_IDS.USER,
        brokers: [KAFKA_BROKERS],
      },
      consumer: {
        groupId: KAFKA_CONSUMER_GROUPS.USER,
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
    .setTitle('Waave User Service API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(httpPort);
  console.log(`🚀 User HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 User HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 User gRPC Server: 0.0.0.0:${grpcPort}`);
}
void bootstrap();
