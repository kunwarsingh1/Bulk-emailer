import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { processEmailJob } from './lib/send-processor';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error('REDIS_URL is not set');
  process.exit(1);
}

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const RATE = parseInt(process.env.SEND_RATE_PER_MINUTE || '10', 10);

console.log(`Worker starting. Rate limit: ${RATE} emails/minute`);

const worker = new Worker(
  'emails',
  async (job) => {
    const { emailId } = job.data;
    console.log(`Processing email ${emailId}`);
    try {
      await processEmailJob(emailId);
      console.log(`Email ${emailId} processed successfully`);
    } catch (err) {
      console.error(`Email ${emailId} failed:`, err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: RATE,
      duration: 60_000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for email ${job.data.emailId}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log('Worker connected to Redis and ready');
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  connection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  connection.disconnect();
  process.exit(0);
});
