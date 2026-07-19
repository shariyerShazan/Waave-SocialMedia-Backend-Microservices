import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_BROKERS } from './constants/kafka.constants';
import { KafkaService } from './kafka.service';
import { KAFKA_SERVICE } from './constants/kafka.constants';

@Module({})
export class KafkaModule {
  static register(clientId: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name: KAFKA_SERVICE,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId,
                brokers: [KAFKA_BROKERS],
              },
              consumer: {
                groupId: `${clientId}-producer`,
              },
            },
          },
        ]),
      ],
      providers: [KafkaService],
      exports: [KafkaService],
    };
  }
}
