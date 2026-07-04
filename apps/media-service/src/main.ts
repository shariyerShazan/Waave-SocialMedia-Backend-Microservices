import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcExceptionFilter } from '@app/common';
import { MediaAppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const grpcPort = Number(process.env.MEDIA_GRPC_PORT) || 3009;
const httpPort = Number(process.env.MEDIA_HTTP_PORT) || 4009;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(MediaAppModule);
  const mediaStoragePath =
    process.env.MEDIA_STORAGE_PATH || join(process.cwd(), 'storage');

  app.useStaticAssets(mediaStoragePath, {
    prefix: '/media',
  });

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'media',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/media.proto'),
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

  await app.startAllMicroservices();

  const config = new DocumentBuilder()
    .setTitle('My Product Media-service API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(httpPort);
  console.log(`🚀 Media HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 Media HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 Media gRPC Server: 0.0.0.0:${grpcPort}`);
}
void bootstrap();
