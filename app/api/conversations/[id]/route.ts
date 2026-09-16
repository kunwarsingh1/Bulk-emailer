import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Conversation } from '@/models/conversation';
import { Contact } from '@/models/contact';
import { Email } from '@/models/email';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db();

  const conversation = await Conversation.findById(id).lean() as any;
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const contact = await Contact.findById(conversation.contactId).lean() as any;
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const emails = await Email.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean() as any[];

  return NextResponse.json({ conversation, contact, emails });
}
