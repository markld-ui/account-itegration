import * as dotenv from 'dotenv';
import { KafkaOptions, Transport } from '@nestjs/microservices';

dotenv.config({ quiet: true });
export const kafkaOptionsFactory = (): KafkaOptions => {
  const options: KafkaOptions['options'] = {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID ?? 'account',
      brokers: (process.env.KAFKA_CLIENT_BROKERS ?? 'localhost:29092')
        .split(',')
        .map((broker) => broker.trim())
        .filter(Boolean),
    },
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP_ID ?? 'account-consumer',
    },
    subscribe: {
      fromBeginning: true,
    },
  };
  return { transport: Transport.KAFKA, options };
};
