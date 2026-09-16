import { db } from '@/lib/db';
import { Email } from '@/models/email';
import { Conversation } from '@/models/conversation';
import { Contact } from '@/models/contact';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await db();

  const [
    totalSent,
    delivered,
    bounced,
    opened,
    clicked,
    replies,
  ] = await Promise.all([
    Email.countDocuments({ direction: 'OUTBOUND' }),
    Email.countDocuments({ direction: 'OUTBOUND', status: 'DELIVERED' }),
    Email.countDocuments({ direction: 'OUTBOUND', status: 'BOUNCED' }),
    Email.countDocuments({ direction: 'OUTBOUND', openedAt: { $ne: null } }),
    Email.countDocuments({ direction: 'OUTBOUND', clickedAt: { $ne: null } }),
    Email.countDocuments({ direction: 'INBOUND' }),
  ]);

  const stats = [
    { label: 'Emails Sent', value: totalSent, color: 'bg-blue-50 text-blue-700' },
    { label: 'Delivered', value: delivered, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Bounced', value: bounced, color: 'bg-red-50 text-red-700' },
    { label: 'Opened', value: opened, color: 'bg-purple-50 text-purple-700' },
    { label: 'Clicked', value: clicked, color: 'bg-amber-50 text-amber-700' },
    { label: 'Replies', value: replies, color: 'bg-cyan-50 text-cyan-700' },
  ];

  const recentConversations = await Conversation.find()
    .sort({ lastActivityAt: -1 })
    .limit(8)
    .lean() as any[];

  const contactIds = [...new Set(recentConversations.map((c: any) => c.contactId.toString()))];
  const contacts = await Contact.find({ _id: { $in: contactIds } })
    .select('name email status')
    .lean() as any[];
  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color} rounded-md px-2 py-1 inline-block`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conv: any) => {
                const contact = contactMap.get(conv.contactId.toString());
                return (
                  <Link
                    key={conv._id.toString()}
                    href={`/conversations/${conv._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{contact?.name ?? 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{conv.subject}</p>
                    </div>
                    <div className="text-right">
                      {conv.replied && <Badge variant="success" className="mb-1">Replied</Badge>}
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(conv.lastActivityAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
