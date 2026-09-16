import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { Email } from '@/models/email';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { recordEvent } from '@/lib/events';
import { ONE_BY_ONE_GIF } from '@/lib/tracking';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await db();

  const email = await Email.findOne({ trackingToken: token });
  if (!email) {
    return new Response(ONE_BY_ONE_GIF, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    });
  }

  const now = new Date();
  const isFirst = !email.openedAt;

  if (isFirst) {
    const newStatus =
      email.status === 'BOUNCED' || email.status === 'FAILED'
        ? email.status
        : 'OPENED';

    await Email.updateOne(
      { _id: email._id },
      {
        $set: { openedAt: now, lastOpenedAt: now, status: newStatus },
        $inc: { openCount: 1 },
      }
    );

    await recordEvent({
      emailId: email._id,
      contactId: email.contactId,
      conversationId: email.conversationId,
      type: 'OPENED',
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
      { $set: { lastOpenedAt: now }, $inc: { openCount: 1 } }
    );
  }

  return new Response(ONE_BY_ONE_GIF, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}
