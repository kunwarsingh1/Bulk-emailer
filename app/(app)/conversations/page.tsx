import { db } from '@/lib/db';
import { Conversation } from '@/models/conversation';
import { Contact } from '@/models/contact';
import { Email } from '@/models/email';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  await db();

  const conversations = await Conversation.find()
    .sort({ lastActivityAt: -1 })
    .limit(500)
    .lean() as any[];

  const contactIds = [...new Set(conversations.map((c: any) => c.contactId.toString()))];
  const contacts = await Contact.find({ _id: { $in: contactIds } })
    .select('name email status')
    .lean() as any[];
  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

  const convIds = conversations.map((c: any) => c._id);
  const lastEmails = await Email.find({ conversationId: { $in: convIds } })
    .sort({ createdAt: -1 })
    .lean() as any[];
  const emailByConv = new Map<string, any>();
  for (const e of lastEmails) {
    const cid = e.conversationId.toString();
    if (!emailByConv.has(cid)) emailByConv.set(cid, e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversations</h1>

      {conversations.length === 0 ? (
        <p className="text-muted-foreground text-sm">No conversations yet.</p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv: any) => {
            const contact = contactMap.get(conv.contactId.toString());
            const lastEmail = emailByConv.get(conv._id.toString());

            function renderBadges() {
              const badges = [];
              if (conv.replied) badges.push(<Badge key="replied" variant="success">Replied</Badge>);
              if (lastEmail?.status === 'BOUNCED') badges.push(<Badge key="bounced" variant="destructive">Bounced</Badge>);
              if (lastEmail?.status === 'COMPLAINT') badges.push(<Badge key="complaint" variant="warning">Complaint</Badge>);
              if (lastEmail?.openedAt) badges.push(<Badge key="opened" variant="info">Opened</Badge>);
              if (lastEmail?.clickedAt) badges.push(<Badge key="clicked" variant="purple">Clicked</Badge>);
              return badges;
            }

            return (
              <Link
                key={conv._id.toString()}
                href={`/conversations/${conv._id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{contact?.name ?? 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{conv.subject}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex gap-1 justify-end flex-wrap">{renderBadges()}</div>
                  <p className="text-xs text-muted-foreground">{timeAgo(conv.lastActivityAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
