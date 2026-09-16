import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Email } from '@/models/email';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db();

  const emails = await Email.find({ direction: 'OUTBOUND' })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean() as any[];

  const contactIds = [...new Set(emails.map((e: any) => e.contactId.toString()))];
  const convIds = [...new Set(emails.map((e: any) => e.conversationId.toString()))];

  const contacts = await Contact.find({ _id: { $in: contactIds } })
    .select('name email')
    .lean() as any[];
  const conversations = await Conversation.find({ _id: { $in: convIds } })
    .select('subject')
    .lean() as any[];

  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));
  const convMap = new Map(conversations.map((c: any) => [c._id.toString(), c]));

  return NextResponse.json({
    emails: emails.map((e) => {
      const contact = contactMap.get(e.contactId.toString());
      const conv = convMap.get(e.conversationId.toString());
      return {
        _id: e._id,
        recipientName: contact?.name ?? 'Unknown',
        recipientEmail: contact?.email ?? e.recipientEmail,
        subject: e.subject,
        conversationSubject: conv?.subject ?? 'Unknown',
        status: e.status,
        openedAt: e.openedAt,
        clickedAt: e.clickedAt,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
      };
    }),
  });
}
