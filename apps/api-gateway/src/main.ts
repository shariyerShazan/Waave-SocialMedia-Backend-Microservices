import { NestFactory } from '@nestjs/core';
import { GatewayAppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(GatewayAppModule);

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
    .setTitle('My Product API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const httpPort = Number(process.env.API_GATEWAY_HTTP_PORT!) || 4000;
  await app.listen(httpPort ?? 4000);
  console.log(`🚀 Gateway HTTP Server: http://localhost:${httpPort}`);
  console.log(
    `🚀 Gateway HTTP Server Swagger Docs: http://localhost:${httpPort}/docs`,
  );
}
void bootstrap();
