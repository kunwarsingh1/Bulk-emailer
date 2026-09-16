import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Draft } from '@/models/draft';

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
  const drafts = await Draft.find()
    .sort({ updatedAt: -1 })
    .populate('recipientIds', 'name email')
    .lean();
  return NextResponse.json({ drafts });
}

const draftSchema = z.object({
  subject: z.string().max(300).optional().default(''),
  body: z.string().max(100000).optional().default(''),
  recipientIds: z.array(z.string()).optional().default([]),
  conversationId: z.string().nullable().optional().default(null),
  draftId: z.string().nullable().optional().default(null),
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

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { draftId, ...data } = parsed.data;

  await db();

  if (draftId) {
    const draft = await Draft.findByIdAndUpdate(
      draftId,
      { $set: data },
      { new: true }
    ).lean();
    return NextResponse.json({ draft });
  }

  const draft = await Draft.create(data);
  return NextResponse.json({ draft }, { status: 201 });
}
