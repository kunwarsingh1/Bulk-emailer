import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { parseImportText } from '@/lib/import';
import { normalizeEmail } from '@/lib/utils';

async function requireAuth(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return null;
  return session;
}

const parseSchema = z.object({
  entriesText: z.string().min(1).max(200000),
});

const importSchema = z.object({
  entries: z.array(z.object({ name: z.string(), email: z.string() })).min(1).max(5000),
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

  await db();

  if ((body as Record<string, unknown>).entriesText) {
    const parsed = parseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = parseImportText(parsed.data.entriesText);
    const emails = result.valid.map((e) => e.email);
    const existing = await Contact.find({ email: { $in: emails } })
      .select('email')
      .lean();
    const existingSet = new Set(existing.map((e) => e.email));

    const importable = result.valid.filter((e) => !existingSet.has(e.email));
    const duplicateCount =
      result.valid.length - importable.length + existingSet.size;

    return NextResponse.json({
      total: result.valid.length + result.invalidLines.length,
      validCount: importable.length,
      duplicateCount,
      invalidCount: result.invalidLines.length,
      valid: importable,
      invalidLines: result.invalidLines,
    });
  }

  if ((body as Record<string, unknown>).entries) {
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const entries = parsed.data.entries.map((e) => ({
      name: e.name,
      email: normalizeEmail(e.email),
    }));

    const emails = entries.map((e) => e.email);
    const existing = await Contact.find({ email: { $in: emails } })
      .select('email')
      .lean();
    const existingSet = new Set(existing.map((e) => e.email));

    const toCreate = entries.filter((e) => !existingSet.has(e.email));

    if (toCreate.length > 0) {
      await Contact.insertMany(
        toCreate.map((e) => ({
          name: e.name,
          email: e.email,
          description: '',
        }))
      );
    }

    return NextResponse.json({
      created: toCreate.length,
      skipped: existingSet.size,
    });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
