import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Email } from '@/models/email';

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get('batchId');
  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  await db();

  const rows = await Email.aggregate([
    { $match: { batchId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row._id] = row.count;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const queued = counts['QUEUED'] ?? 0;
  const sent = counts['SENT'] ?? 0;
  const delivered = counts['DELIVERED'] ?? 0;
  const bounced = counts['BOUNCED'] ?? 0;
  const failed = counts['FAILED'] ?? 0;
  const complaint = counts['COMPLAINT'] ?? 0;
  const opened = counts['OPENED'] ?? 0;

  const pending = queued + sent;
  const processed = delivered + bounced + failed + complaint;

  return NextResponse.json({
    total,
    queued,
    sent,
    delivered,
    bounced,
    failed,
    complaint,
    opened,
    pending,
    processed,
  });
}
