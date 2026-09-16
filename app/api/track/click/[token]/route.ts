import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Email } from '@/models/email';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { recordEvent } from '@/lib/events';
import { decodeTargetUrl } from '@/lib/tracking';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const urlParam = req.nextUrl.searchParams.get('u');

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const targetUrl = decodeTargetUrl(urlParam);
  if (!targetUrl) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  await db();

  const email = await Email.findOne({ trackingToken: token });
  if (email && email.direction === 'OUTBOUND') {
    const now = new Date();
    const isFirst = !email.clickedAt;

    if (isFirst) {
      await Email.updateOne(
        { _id: email._id },
        { $set: { clickedAt: now, lastClickedAt: now }, $inc: { clickCount: 1 } }
      );

      await recordEvent({
        emailId: email._id,
        contactId: email.contactId,
        conversationId: email.conversationId,
        type: 'CLICKED',
      });

      await Conversation.updateOne(
        { _id: email.conversationId },
        { $set: { lastActivityAt: now } }
      );
      await Contact.updateOne(
        { _id: email.contactId },
        { $set: { lastActivityAt: now } }
      );
    } else {
      await Email.updateOne(
        { _id: email._id },
        { $set: { lastClickedAt: now }, $inc: { clickCount: 1 } }
      );
    }
  }

  return NextResponse.redirect(targetUrl, 302);
}
