import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcExceptionFilter } from '@app/common';
import { PostAppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const grpcPort = Number(process.env.POST_GRPC_PORT) || 3003;
const httpPort = Number(process.env.POST_HTTP_PORT) || 4003;

async function bootstrap() {
  const app = await NestFactory.create(PostAppModule);

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'post',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/post.proto'),
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
    .setTitle('Waave Post Service API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(httpPort);
  console.log(`🚀 Post HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 Post HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
  console.log(`🚀 Post gRPC Server: 0.0.0.0:${grpcPort}`);
}
void bootstrap();
