import { db } from './db';
import { Suppression } from '../models/suppression';
import { normalizeEmail } from './utils';

export type SuppressionReason = 'HARD_BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBED' | 'MANUAL';

export async function isSuppressed(email: string): Promise<boolean> {
  await db();
  return !!(await Suppression.findOne({ email: normalizeEmail(email) }).lean());
}

export async function addSuppression(
  email: string,
  reason: SuppressionReason
): Promise<void> {
  await db();
  await Suppression.updateOne(
    { email: normalizeEmail(email) },
    { $setOnInsert: { email: normalizeEmail(email), reason, createdAt: new Date() } },
    { upsert: true }
  );
}
