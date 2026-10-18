import { Kafka } from 'kafkajs';
import { kafkaOptionsFactory } from './kafka.config.js';

export async function ensureKafkaTopics(topics: string[]): Promise<void> {
  const client = kafkaOptionsFactory().options?.client;
  if (!client?.brokers) throw new Error('Kafka brokers are required');
  const admin = new Kafka({ clientId: client.clientId, brokers: client.brokers }).admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
    });
  } finally {
    await admin.disconnect();
  }
}
