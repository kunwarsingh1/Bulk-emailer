import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { Email } from '@/models/email';
import { personalizeText, textToHtml } from '@/lib/personalization';
import { isSuppressed } from '@/lib/suppression';
import { enqueueEmail, newBatchId } from '@/lib/queue';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

const sendSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(100000),
  mode: z.enum(['new', 'followup']),
  keys: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { subject, body: emailBody, mode, keys } = parsed.data;
  await db();

  const batchId = newBatchId();
  const queued: string[] = [];
  const skipped: Array<{ key: string; reason: string }> = [];

  if (mode === 'new') {
    const contacts = await Contact.find({ _id: { $in: keys } }).lean() as any[];
    const now = new Date();

    for (const contact of contacts) {
      const suppressed = await isSuppressed(contact.email);
      if (suppressed) {
        skipped.push({ key: contact._id.toString(), reason: 'Suppressed' });
        continue;
      }

      const subResult = personalizeText(subject, contact.name);
      const bodyResult = personalizeText(emailBody, contact.name);

      if (subResult.flagged || bodyResult.flagged) {
        skipped.push({
          key: contact._id.toString(),
          reason: subResult.flagged ? subResult.reason! : bodyResult.reason!,
        });
        continue;
      }

      const conversation = await Conversation.create({
        contactId: contact._id,
        subject: subResult.text,
        lastActivityAt: now,
      });

      const email = await Email.create({
        contactId: contact._id,
        conversationId: conversation._id,
        direction: 'OUTBOUND',
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject: subResult.text,
        htmlBody: textToHtml(bodyResult.text),
        textBody: bodyResult.text,
        status: 'QUEUED',
        batchId,
      });

      await enqueueEmail(email._id.toString());
      queued.push(contact._id.toString());
    }
  } else {
    const conversations = await Conversation.find({ _id: { $in: keys } }).lean() as any[];
    const contactIds = [...new Set(conversations.map((c: any) => c.contactId.toString()))];
    const contacts = await Contact.find({ _id: { $in: contactIds } }).lean() as any[];
    const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

    for (const conv of conversations) {
      const contact = contactMap.get(conv.contactId.toString());
      if (!contact) {
        skipped.push({ key: conv._id.toString(), reason: 'Contact not found' });
        continue;
      }

      const suppressed = await isSuppressed(contact.email);
      if (suppressed) {
        skipped.push({ key: conv._id.toString(), reason: 'Suppressed' });
        continue;
      }

      const subResult = personalizeText(subject, contact.name);
      const bodyResult = personalizeText(emailBody, contact.name);

      if (subResult.flagged || bodyResult.flagged) {
        skipped.push({
          key: conv._id.toString(),
          reason: subResult.flagged ? subResult.reason! : bodyResult.reason!,
        });
        continue;
      }

      const prev = await Email.find({
        conversationId: conv._id,
        messageId: { $ne: null },
      })
        .sort({ createdAt: 1 })
        .select('messageId')
        .lean() as any[];

      const chain = prev.map((e) => e.messageId!).filter(Boolean);
      const inReplyTo = chain.length > 0 ? chain[chain.length - 1] : null;
      const references = chain;

      const email = await Email.create({
        contactId: contact._id,
        conversationId: conv._id,
        direction: 'OUTBOUND',
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject: subResult.text,
        htmlBody: textToHtml(bodyResult.text),
        textBody: bodyResult.text,
        inReplyTo,
        references,
        status: 'QUEUED',
        batchId,
      });

      await Conversation.updateOne(
        { _id: conv._id },
        { $set: { lastActivityAt: new Date() } }
      );
      await Contact.updateOne(
        { _id: contact._id },
        { $set: { lastActivityAt: new Date() } }
      );

      await enqueueEmail(email._id.toString());
      queued.push(conv._id.toString());
    }
  }

  return NextResponse.json({
    batchId,
    queued: queued.length,
    skipped,
  });
}
