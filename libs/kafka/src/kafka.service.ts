import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Kafka, Producer } from 'kafkajs';

import {
  KAFKA_CLIENT_IDS,
  KAFKA_SERVICE,
  KafkaTopics,
} from './constants/kafka.constants';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);

  private producer: Producer;

  constructor(
    @Inject(KAFKA_SERVICE)
    private readonly kafkaClient: ClientKafka,
  ) {
    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_IDS.MAIN,
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.kafkaClient.connect(); // Nest RPC + normal emit
    await this.producer.connect(); // Native producer

    this.logger.log('Kafka connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  // Existing emit (unchanged)
  async emit<T>(topic: KafkaTopics, payload: T): Promise<void> {
    await firstValueFrom(this.kafkaClient.emit(topic, payload));
  }

  // New emit with partition key
  async emitWithKey<T>(
    topic: KafkaTopics,
    key: string,
    payload: T,
  ): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
        },
      ],
    });
  }

  // Existing RPC (unchanged)
  async send<TPayload, TResult>(
    topic: string,
    payload: TPayload,
  ): Promise<TResult> {
    return firstValueFrom(
      this.kafkaClient.send<TResult, TPayload>(topic, payload),
    );
  }
}
