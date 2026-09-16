import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { normalizeEmail, escapeRegex } from '@/lib/utils';

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

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const contacts = await Contact.find(filter)
    .sort({ lastActivityAt: -1, createdAt: -1 })
    .limit(1000)
    .lean() as any[];

  const contactIds = contacts.map((c: any) => c._id);
  const convs = await Conversation.find({ contactId: { $in: contactIds } })
    .sort({ lastActivityAt: -1 })
    .lean() as any[];

  const latest = new Map<string, string>();
  for (const c of convs) {
    const cid = c.contactId.toString();
    if (!latest.has(cid)) latest.set(cid, c.subject);
  }

  return NextResponse.json({
    contacts: contacts.map((c: any) => ({
      ...c,
      activeConversation: latest.get(c._id.toString()) ?? null,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  description: z.string().max(5000).optional().default(''),
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, description } = parsed.data;
  const norm = normalizeEmail(email);

  await db();

  const existing = await Contact.findOne({ email: norm }).lean() as any;
  if (existing) {
    return NextResponse.json({ error: 'A contact with this email already exists' }, { status: 409 });
  }

  const contact = await Contact.create({
    name,
    email: norm,
    description: description || '',
  });

  return NextResponse.json({ contact }, { status: 201 });
}
