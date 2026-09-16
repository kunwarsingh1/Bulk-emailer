import crypto from 'crypto';
import { Queue } from 'bullmq';
import { redis } from './redis';

let queue: Queue | null = null;

export function emailQueue(): Queue {
  if (!queue) {
    queue = new Queue('emails', { connection: redis() });
  }
  return queue;
}

export async function enqueueEmail(emailId: string): Promise<void> {
  await emailQueue().add('send-email', { emailId }, {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 2000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export function newBatchId(): string {
  return crypto.randomBytes(12).toString('base64url');
}
