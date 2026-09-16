import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { db } from '@/lib/db';
import { Email } from '@/models/email';

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

  const [
    totalSent,
    delivered,
    bounced,
    opened,
    clicked,
    replies,
    complaints,
  ] = await Promise.all([
    Email.countDocuments({ direction: 'OUTBOUND' }),
    Email.countDocuments({ direction: 'OUTBOUND', status: 'DELIVERED' }),
    Email.countDocuments({ direction: 'OUTBOUND', status: 'BOUNCED' }),
    Email.countDocuments({ direction: 'OUTBOUND', openedAt: { $ne: null } }),
    Email.countDocuments({ direction: 'OUTBOUND', clickedAt: { $ne: null } }),
    Email.countDocuments({ direction: 'INBOUND' }),
    Email.countDocuments({ direction: 'OUTBOUND', status: 'COMPLAINT' }),
  ]);

  return NextResponse.json({
    totalSent,
    delivered,
    bounced,
    opened,
    clicked,
    replies,
    complaints,
  });
}
