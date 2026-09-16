import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { Email } from '@/models/email';
import { EmailEvent } from '@/models/emailEvent';

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

  const contact = await Contact.findById(id).lean();
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const conversations = await Conversation.find({ contactId: id })
    .sort({ lastActivityAt: -1 })
    .lean();

  const events = await EmailEvent.find({ contactId: id })
    .sort({ at: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ contact, conversations, events });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  description: z.string().max(5000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db();

  if (parsed.data.email) {
    const norm = parsed.data.email.trim().toLowerCase();
    const existing = await Contact.findOne({ email: norm, _id: { $ne: id } }).lean();
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    parsed.data.email = norm;
  }

  const contact = await Contact.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json({ contact });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = NextResponse.next();
  const auth = await requireAuth(req, res);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await db();

  const contact = await Contact.findById(id).lean();
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const conversations = await Conversation.find({ contactId: id }).select('_id').lean();
  const convIds = conversations.map((c) => c._id);

  await Email.deleteMany({ contactId: id });
  if (convIds.length > 0) {
    await Email.deleteMany({ conversationId: { $in: convIds } });
  }
  await EmailEvent.deleteMany({ contactId: id });
  await Conversation.deleteMany({ contactId: id });
  await Contact.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}
