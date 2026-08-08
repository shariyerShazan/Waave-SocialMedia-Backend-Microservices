import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcExceptionFilter } from '@app/common';
import { E2eeChatAppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const grpcPort = Number(process.env.E2EE_CHAT_GRPC_PORT) || 3006;
const httpPort = Number(process.env.E2EE_CHAT_HTTP_PORT) || 4006;

async function bootstrap() {
  const app = await NestFactory.create(E2eeChatAppModule);

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'e2ee_chat',
      protoPath: join(
        process.cwd(),
        'libs/proto-schema/src/proto/e2ee-chat.proto',
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
    .setTitle('Waave E2EE chat Service API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(httpPort);
  console.log(`🚀 E2EE chat HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 E2EE chat HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 E2EE chat gRPC Server: 0.0.0.0:${grpcPort}`);
}
void bootstrap();
