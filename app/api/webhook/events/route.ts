import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/provider';
import {
  markDelivered,
  markBounced,
  markComplained,
  markOpenedByProviderId,
  markClickedByProviderId,
} from '@/lib/events';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-resend-signature') ?? undefined;

  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = payload.name as string | undefined;
  const providerId = payload.email_id as string | undefined;
  const data = payload.data as Record<string, unknown> | undefined;

  if (!name || !providerId) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (name === 'email.delivery_status') {
      const status = data?.status as string | undefined;
      const emailAddr = data?.email as string | undefined;

      if (status === 'delivered') {
        await markDelivered(providerId);
      } else if (status === 'bounced' || status === 'hard_bounce') {
        await markBounced(providerId, true, emailAddr);
      } else if (status === 'soft_bounce') {
        await markBounced(providerId, false, emailAddr);
      } else if (status === 'complained') {
        await markComplained(providerId, emailAddr);
      }
    } else if (name === 'email.opened') {
      await markOpenedByProviderId(providerId);
    } else if (name === 'email.clicked') {
      await markClickedByProviderId(providerId);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  return NextResponse.json({ ok: true });
}
