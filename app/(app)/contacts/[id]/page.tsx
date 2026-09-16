import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { EmailEvent } from '@/models/emailEvent';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await db();

  const contact = await Contact.findById(id).lean() as any;
  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  const conversations = await Conversation.find({ contactId: id })
    .sort({ lastActivityAt: -1 })
    .lean() as any[];

  const events = await EmailEvent.find({ contactId: id })
    .sort({ at: -1 })
    .limit(30)
    .lean() as any[];

  function statusBadge(status: string) {
    switch (status) {
      case 'BOUNCED': return <Badge variant="destructive">Bounced</Badge>;
      case 'REPLIED': return <Badge variant="success">Replied</Badge>;
      case 'UNSUBSCRIBED': return <Badge variant="warning">Unsubscribed</Badge>;
      default: return <Badge variant="secondary">Active</Badge>;
    }
  }

  function eventLabel(type: string) {
    switch (type) {
      case 'SENT': return 'Email sent';
      case 'DELIVERED': return 'Email delivered';
      case 'BOUNCED': return 'Email bounced';
      case 'OPENED': return 'Email opened';
      case 'CLICKED': return 'Link clicked';
      case 'REPLY': return 'Reply received';
      case 'COMPLAINT': return 'Complaint reported';
      case 'FAILED': return 'Send failed';
      default: return type;
    }
  }

  function eventBadge(type: string) {
    switch (type) {
      case 'SENT': return <Badge variant="secondary">Sent</Badge>;
      case 'DELIVERED': return <Badge variant="success">Delivered</Badge>;
      case 'BOUNCED': return <Badge variant="destructive">Bounced</Badge>;
      case 'OPENED': return <Badge variant="info">Opened</Badge>;
      case 'CLICKED': return <Badge variant="purple">Clicked</Badge>;
      case 'REPLY': return <Badge variant="success">Reply</Badge>;
      case 'COMPLAINT': return <Badge variant="warning">Complaint</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contacts">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{contact.name || 'Unknown'}</h1>
          <p className="text-muted-foreground">{contact.email}</p>
        </div>
        <div className="ml-auto">{statusBadge(contact.status)}</div>
      </div>

      {contact.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap">{contact.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div key={conv._id.toString()} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Link
                      href={`/conversations/${conv._id}`}
                      className="font-medium hover:underline"
                    >
                      {conv.subject}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last activity: {timeAgo(conv.lastActivityAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/conversations/${conv._id}`}>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-3 w-3 mr-1" /> Open
                      </Button>
                    </Link>
                    <Link href={`/compose?conversationId=${conv._id}`}>
                      <Button size="sm">Follow Up</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev._id.toString()} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {eventBadge(ev.type)}
                    <span className="text-sm">{eventLabel(ev.type)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(ev.at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
