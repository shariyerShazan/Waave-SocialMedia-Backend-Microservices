import { NestFactory } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';

const grpcPort = Number(process.env.USER_GRPC_PORT) || 3002;
async function bootstrap() {
  const logger = new Logger('UserService');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(
          process.cwd(),
          'libs/proto-schema/src/proto/user.proto',
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
    },
  );
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

  await app.listen();
  logger.log(
    `User Service running on port ${process.env.USER_GRPC_PORT || 3002}`,
  );
}
bootstrap();
