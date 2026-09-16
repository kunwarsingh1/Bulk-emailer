import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/provider';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { Email } from '@/models/email';
import { recordEvent } from '@/lib/events';
import { sanitizeHtml } from '@/lib/sanitize';
import { textToHtml } from '@/lib/personalization';

function extractEmail(from: string): string | null {
  const angle = from.match(/<([^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const bare = from.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare)) return bare.toLowerCase();
  return null;
}

function stripReplyPrefix(subject: string): string {
  return subject.replace(/^(re|fw|fwd|aw|sv|vs):\s*/gi, '').trim();
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-resend-signature') ?? undefined;

  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailData = payload.data as Record<string, unknown> | undefined;
  if (!emailData) {
    return NextResponse.json({ ok: true });
  }

  const from = (emailData.from as string) ?? '';
  const senderEmail = extractEmail(from);
  if (!senderEmail) {
    return NextResponse.json({ ok: true });
  }

  const subject = (emailData.subject as string) ?? '';
  const text = (emailData.text as string) ?? '';
  const html = (emailData.html as string) ?? '';
  const headers = (emailData.headers as Record<string, string>) ?? {};

  const inReplyTo = headers['in-reply-to'] ?? headers['In-Reply-To'] ?? null;
  const referencesRaw = headers['references'] ?? headers['References'] ?? null;
  const messageId = headers['message-id'] ?? headers['Message-ID'] ?? null;

  const refs = referencesRaw
    ? referencesRaw.split(/\s+/).filter(Boolean)
    : [];

  await db();

  const contact = await Contact.findOne({ email: senderEmail }).lean() as any;
  if (!contact) {
    console.log(`Inbound email from unknown sender: ${senderEmail}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  let conversationId: string | null = null;

  const candidateIds = [inReplyTo, ...refs].filter(Boolean);
  if (candidateIds.length > 0) {
    const matchEmail = await Email.findOne({
      contactId: contact._id,
      messageId: { $in: candidateIds },
    })
      .select('conversationId')
      .lean() as any;
    if (matchEmail) {
      conversationId = matchEmail.conversationId.toString();
    }
  }

  if (!conversationId) {
    const latest = await Conversation.findOne({ contactId: contact._id })
      .sort({ lastActivityAt: -1 })
      .lean() as any;
    if (latest) {
      conversationId = latest._id.toString();
    }
  }

  if (!conversationId) {
    const conv = await Conversation.create({
      contactId: contact._id,
      subject: stripReplyPrefix(subject),
      lastActivityAt: new Date(),
    });
    conversationId = conv._id.toString();
  }

  const now = new Date();
  const cleanHtml = html ? sanitizeHtml(html) : textToHtml(text);

  const email = await Email.create({
    contactId: contact._id,
    conversationId,
    direction: 'INBOUND',
    recipientEmail: process.env.EMAIL_FROM ?? '',
    recipientName: process.env.EMAIL_FROM_NAME ?? '',
    subject,
    htmlBody: cleanHtml,
    textBody: text,
    messageId,
    status: 'RECEIVED',
    sentAt: now,
  });

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { replied: true, lastActivityAt: now, lastMessageId: messageId } }
  );

  await Contact.updateOne(
    { _id: contact._id },
    {
      $set: {
        lastActivityAt: now,
        status: contact.status === 'BOUNCED' ? 'BOUNCED' : 'REPLIED',
      },
    }
  );

  await recordEvent({
    emailId: email._id,
    contactId: contact._id,
    conversationId,
    type: 'REPLY',
    meta: { from: senderEmail, subject },
  });

  return NextResponse.json({ ok: true });
}
