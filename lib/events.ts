import { db } from './db';
import { EmailEvent } from '../models/emailEvent';
import { Email } from '../models/email';
import { Contact } from '../models/contact';
import { Conversation } from '../models/conversation';
import type { Types } from 'mongoose';

export interface RecordEventInput {
  emailId: Types.ObjectId | string;
  contactId: Types.ObjectId | string;
  conversationId?: Types.ObjectId | string | null;
  type: string;
  meta?: Record<string, unknown> | null;
  at?: Date;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  await db();
  await EmailEvent.create({
    emailId: input.emailId,
    contactId: input.contactId,
    conversationId: input.conversationId ?? null,
    type: input.type,
    at: input.at ?? new Date(),
    meta: input.meta ?? null,
  });
}

async function updateActivity(contactId: Types.ObjectId | string, convId: Types.ObjectId | string | null) {
  const now = new Date();
  await Contact.updateOne({ _id: contactId }, { $set: { lastActivityAt: now } });
  if (convId) {
    await Conversation.updateOne({ _id: convId }, { $set: { lastActivityAt: now } });
  }
}

export async function markDelivered(providerId: string): Promise<void> {
  await db();
  const email = await Email.findOne({ providerId });
  if (!email || email.direction !== 'OUTBOUND') return;
  if (['DELIVERED', 'BOUNCED', 'FAILED', 'COMPLAINT'].includes(email.status)) return;

  const now = new Date();
  await Email.updateOne({ _id: email._id }, { $set: { status: 'DELIVERED', deliveredAt: now } });
  await recordEvent({ emailId: email._id, contactId: email.contactId, conversationId: email.conversationId, type: 'DELIVERED' });
  await updateActivity(email.contactId, email.conversationId);
}

export async function markBounced(
  providerId: string,
  hard: boolean,
  emailAddr?: string
): Promise<void> {
  await db();
  const email = await Email.findOne({ providerId });
  if (!email || email.direction !== 'OUTBOUND') return;

  const now = new Date();
  await Email.updateOne({ _id: email._id }, { $set: { status: 'BOUNCED', bouncedAt: now } });
  await recordEvent({ emailId: email._id, contactId: email.contactId, conversationId: email.conversationId, type: 'BOUNCED', meta: { hard } });

  if (hard && emailAddr) {
    const { addSuppression } = await import('./suppression');
    await addSuppression(emailAddr, 'HARD_BOUNCE');
    await Contact.updateOne({ _id: email.contactId }, { $set: { status: 'BOUNCED' } });
  }

  await updateActivity(email.contactId, email.conversationId);
}

export async function markComplained(
  providerId: string,
  emailAddr?: string
): Promise<void> {
  await db();
  const email = await Email.findOne({ providerId });
  if (!email || email.direction !== 'OUTBOUND') return;

  await Email.updateOne({ _id: email._id }, { $set: { status: 'COMPLAINT' } });
  await recordEvent({ emailId: email._id, contactId: email.contactId, conversationId: email.conversationId, type: 'COMPLAINT' });

  if (emailAddr) {
    const { addSuppression } = await import('./suppression');
    await addSuppression(emailAddr, 'COMPLAINT');
    await Contact.updateOne({ _id: email.contactId }, { $set: { status: 'UNSUBSCRIBED' } });
  }
}

export async function markOpenedByProviderId(providerId: string): Promise<void> {
  await db();
  const email = await Email.findOne({ providerId });
  if (!email || email.direction !== 'OUTBOUND') return;
  if (email.status === 'BOUNCED' || email.status === 'FAILED') return;

  const now = new Date();
  if (!email.openedAt) {
    await Email.updateOne(
      { _id: email._id },
      { $set: { openedAt: now, lastOpenedAt: now, status: 'OPENED' }, $inc: { openCount: 1 } }
    );
    await recordEvent({ emailId: email._id, contactId: email.contactId, conversationId: email.conversationId, type: 'OPENED' });
    await updateActivity(email.contactId, email.conversationId);
  } else {
    await Email.updateOne(
      { _id: email._id },
      { $set: { lastOpenedAt: now }, $inc: { openCount: 1 } }
    );
  }
}

export async function markClickedByProviderId(providerId: string): Promise<void> {
  await db();
  const email = await Email.findOne({ providerId });
  if (!email || email.direction !== 'OUTBOUND') return;
  if (email.status === 'BOUNCED' || email.status === 'FAILED') return;

  const now = new Date();
  if (!email.clickedAt) {
    await Email.updateOne(
      { _id: email._id },
      { $set: { clickedAt: now, lastClickedAt: now }, $inc: { clickCount: 1 } }
    );
    await recordEvent({ emailId: email._id, contactId: email.contactId, conversationId: email.conversationId, type: 'CLICKED' });
    await updateActivity(email.contactId, email.conversationId);
  } else {
    await Email.updateOne(
      { _id: email._id },
      { $set: { lastClickedAt: now }, $inc: { clickCount: 1 } }
    );
  }
}
