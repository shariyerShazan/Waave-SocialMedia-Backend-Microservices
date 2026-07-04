// import { KafkaModule } from '@app/kafka';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PostPrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    PostPrismaModule,
  ],
})
export class PostAppModule {}
