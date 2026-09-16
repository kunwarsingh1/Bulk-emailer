import { db } from '@/lib/db';
import { Conversation } from '@/models/conversation';
import { Contact } from '@/models/contact';
import { Email } from '@/models/email';
import { formatDateShort } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function emailBadges(email: {
  status: string;
  openedAt: Date | null;
  clickedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  openCount: number;
  clickCount: number;
}) {
  const badges = [];
  if (email.status === 'SENT') badges.push(<Badge key="sent" variant="secondary">Sent</Badge>);
  if (email.deliveredAt) badges.push(<Badge key="delivered" variant="success">Delivered</Badge>);
  if (email.status === 'BOUNCED') badges.push(<Badge key="bounced" variant="destructive">Bounced</Badge>);
  if (email.status === 'FAILED') badges.push(<Badge key="failed" variant="destructive">Failed</Badge>);
  if (email.openedAt) badges.push(<Badge key="opened" variant="info">Opened {email.openCount > 1 ? `(${email.openCount}x)` : ''}</Badge>);
  if (email.clickedAt) badges.push(<Badge key="clicked" variant="purple">Clicked {email.clickCount > 1 ? `(${email.clickCount}x)` : ''}</Badge>);
  return badges;
}

export default async function ConversationViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await db();

  const conversation = await Conversation.findById(id).lean() as any;
  if (!conversation) {
    return <div className="p-8 text-center text-muted-foreground">Conversation not found.</div>;
  }

  const contact = await Contact.findById(conversation.contactId).lean() as any;
  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  const emails = await Email.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean() as any[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/conversations">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">{contact.name || 'Unknown'}</h1>
          <p className="text-sm text-muted-foreground">{contact.email}</p>
          <p className="text-sm font-medium mt-1">{conversation.subject}</p>
        </div>
      </div>

      <div className="space-y-1">
        {emails.map((email) => (
          <Card key={email._id.toString()} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">
                  {email.direction === 'OUTBOUND' ? 'You' : (contact.name || contact.email)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(email.sentAt ?? email.createdAt)}
                </p>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none text-sm mb-2"
              dangerouslySetInnerHTML={{ __html: email.htmlBody }}
            />
            {email.direction === 'OUTBOUND' && (
              <div className="flex gap-1 flex-wrap">
                {emailBadges(email as any)}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Link href={`/compose?conversationId=${id}`}>
          <Button size="lg">Follow Up</Button>
        </Link>
      </div>
    </div>
  );
}
