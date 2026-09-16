import { db } from './db';
import { Email } from '../models/email';
import { Contact } from '../models/contact';
import { Conversation } from '../models/conversation';
import { recordEvent } from './events';
import { send } from './provider';
import { injectTracking, generateTrackingToken } from './tracking';
import { textToHtml } from './personalization';

export async function processEmailJob(emailId: string): Promise<void> {
  await db();
  const email = await Email.findById(emailId);
  if (!email) return;
  if (email.direction !== 'OUTBOUND' || email.status !== 'QUEUED') return;

  try {
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    let html = email.htmlBody ?? textToHtml(email.textBody ?? '');
    const text = email.textBody ?? '';

    if (!email.trackingToken) {
      email.trackingToken = generateTrackingToken();
    }

    if (process.env.TRACKING_ENABLED !== 'false') {
      html = injectTracking(html, email.trackingToken, appUrl);
    }

    const result = await send({
      to: email.recipientEmail,
      toName: email.recipientName || undefined,
      subject: email.subject,
      html,
      text,
      inReplyTo: email.inReplyTo,
      references: email.references,
    });

    const now = new Date();
    email.status = 'SENT';
    email.sentAt = now;
    email.providerId = result.providerId;
    email.providerMessageId = result.messageId;
    email.messageId = result.messageId;
    await email.save();

    await recordEvent({
      emailId: email._id,
      contactId: email.contactId,
      conversationId: email.conversationId,
      type: 'SENT',
    });

    await Conversation.updateOne(
      { _id: email.conversationId },
      { $set: { lastMessageId: result.messageId, lastActivityAt: now } }
    );

    await Contact.updateOne(
      { _id: email.contactId },
      { $set: { lastActivityAt: now } }
    );
  } catch (err) {
    email.status = 'FAILED';
    email.error = String(err instanceof Error ? err.message : err);
    await email.save();

    await recordEvent({
      emailId: email._id,
      contactId: email.contactId,
      conversationId: email.conversationId,
      type: 'FAILED',
      meta: { error: email.error },
    });
  }
}
