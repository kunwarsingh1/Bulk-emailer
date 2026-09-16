import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { personalizeText } from '@/lib/personalization';
import { isSuppressed } from '@/lib/suppression';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

const previewSchema = z.object({
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

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { subject, body: emailBody, mode, keys } = parsed.data;
  await db();

  const items: Array<{
    key: string;
    contactId: string;
    conversationId: string | null;
    name: string;
    email: string;
    subject: string;
    body: string;
    eligible: boolean;
    reason: string | null;
  }> = [];

  if (mode === 'new') {
    const contacts = await Contact.find({ _id: { $in: keys } }).lean() as any[];
    for (const contact of contacts) {
      const suppressed = await isSuppressed(contact.email);
      const subResult = personalizeText(subject, contact.name);
      const bodyResult = personalizeText(emailBody, contact.name);

      const flagged = subResult.flagged || bodyResult.flagged;
      const reasons: string[] = [];
      if (suppressed) reasons.push('Suppressed');
      if (subResult.flagged) reasons.push(subResult.reason ?? 'Subject flagged');
      if (bodyResult.flagged) reasons.push(bodyResult.reason ?? 'Body flagged');

      items.push({
        key: contact._id.toString(),
        contactId: contact._id.toString(),
        conversationId: null,
        name: contact.name,
        email: contact.email,
        subject: subResult.text,
        body: bodyResult.text,
        eligible: !suppressed && !flagged,
        reason: reasons.length > 0 ? reasons.join('; ') : null,
      });
    }
  } else {
    const conversations = await Conversation.find({ _id: { $in: keys } }).lean() as any[];
    const contactIds = [...new Set(conversations.map((c: any) => c.contactId.toString()))];
    const contacts = await Contact.find({ _id: { $in: contactIds } }).lean() as any[];
    const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

    for (const conv of conversations) {
      const contact = contactMap.get(conv.contactId.toString());
      if (!contact) continue;

      const suppressed = await isSuppressed(contact.email);
      const subResult = personalizeText(subject, contact.name);
      const bodyResult = personalizeText(emailBody, contact.name);

      const flagged = subResult.flagged || bodyResult.flagged;
      const reasons: string[] = [];
      if (suppressed) reasons.push('Suppressed');
      if (subResult.flagged) reasons.push(subResult.reason ?? 'Subject flagged');
      if (bodyResult.flagged) reasons.push(bodyResult.reason ?? 'Body flagged');

      items.push({
        key: conv._id.toString(),
        contactId: contact._id.toString(),
        conversationId: conv._id.toString(),
        name: contact.name,
        email: contact.email,
        subject: subResult.text,
        body: bodyResult.text,
        eligible: !suppressed && !flagged,
        reason: reasons.length > 0 ? reasons.join('; ') : null,
      });
    }
  }

  return NextResponse.json({ items });
}
