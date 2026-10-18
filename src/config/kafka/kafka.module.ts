import { Module } from '@nestjs/common';
import { KAFKA_CLIENT } from './kafka.constant.js';
import { ClientProvider, ClientsModule } from '@nestjs/microservices';
import { kafkaOptionsFactory } from './kafka.config.js';
import { KafkaService } from './kafka.service.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        inject: [],
        useFactory: (): ClientProvider => {
          const config = kafkaOptionsFactory();
          return {
            ...config,
            options: { ...config.options, producerOnlyMode: true },
          };
        },
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
