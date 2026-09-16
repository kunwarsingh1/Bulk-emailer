import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Conversation } from '@/models/conversation';
import { Contact } from '@/models/contact';
import { Email } from '@/models/email';
import { escapeRegex } from '@/lib/utils';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  await db();

  const contactFilter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    contactFilter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }

  let contactIds: string[] | undefined;
  if (q) {
    const matchingContacts = await Contact.find(contactFilter).select('_id').lean() as any[];
    contactIds = matchingContacts.map((c: any) => c._id.toString());
  }

  const convFilter: Record<string, unknown> = {};
  if (contactIds && contactIds.length > 0) {
    convFilter.contactId = { $in: contactIds };
  }
  if (q && contactIds?.length === 0) {
    convFilter.subject = new RegExp(escapeRegex(q), 'i');
  }

  const conversations = await Conversation.find(convFilter)
    .sort({ lastActivityAt: -1 })
    .limit(500)
    .lean() as any[];

  const cIds = conversations.map((c: any) => c.contactId);
  const contacts = await Contact.find({ _id: { $in: cIds } })
    .select('name email status')
    .lean() as any[];
  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

  const convIds = conversations.map((c: any) => c._id);
  const lastEmails = await Email.find({ conversationId: { $in: convIds } })
    .sort({ createdAt: -1 })
    .lean() as any[];
  const emailByConv = new Map<string, any>();
  for (const e of lastEmails) {
    const cid = e.conversationId.toString();
    if (!emailByConv.has(cid)) emailByConv.set(cid, e);
  }

  return NextResponse.json({
    conversations: conversations.map((c: any) => {
      const contact = contactMap.get(c.contactId.toString());
      const lastEmail = emailByConv.get(c._id.toString());
      return {
        ...c,
        contactName: contact?.name ?? 'Unknown',
        contactEmail: contact?.email ?? '',
        lastEmailStatus: lastEmail?.status ?? null,
        lastEmailDirection: lastEmail?.direction ?? null,
      };
    }),
  });
}
