import { db } from '@/lib/db';
import { Email } from '@/models/email';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { formatDateShort } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  await db();

  const emails = await Email.find({ direction: 'OUTBOUND' })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean() as any[];

  const contactIds = [...new Set(emails.map((e: any) => e.contactId.toString()))];
  const convIds = [...new Set(emails.map((e: any) => e.conversationId.toString()))];

  const contacts = await Contact.find({ _id: { $in: contactIds } })
    .select('name email')
    .lean() as any[];
  const conversations = await Conversation.find({ _id: { $in: convIds } })
    .select('subject')
    .lean() as any[];

  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));
  const convMap = new Map(conversations.map((c: any) => [c._id.toString(), c]));

  function statusBadges(email: any) {
    const badges = [];
    if (email.status === 'SENT') badges.push(<Badge key="sent" variant="secondary">Sent</Badge>);
    if (email.deliveredAt) badges.push(<Badge key="delivered" variant="success">Delivered</Badge>);
    if (email.status === 'BOUNCED') badges.push(<Badge key="bounced" variant="destructive">Bounced</Badge>);
    if (email.status === 'FAILED') badges.push(<Badge key="failed" variant="destructive">Failed</Badge>);
    if (email.openedAt) badges.push(<Badge key="opened" variant="info">Opened</Badge>);
    if (email.clickedAt) badges.push(<Badge key="clicked" variant="purple">Clicked</Badge>);
    return badges;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email History</h1>

      {emails.length === 0 ? (
        <p className="text-muted-foreground text-sm">No emails sent yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Conversation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Clicked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((e: any) => {
                const contact = contactMap.get(e.contactId.toString());
                const conv = convMap.get(e.conversationId.toString());
                return (
                  <TableRow key={e._id.toString()}>
                    <TableCell>
                      <Link href={`/contacts/${e.contactId}`} className="font-medium hover:underline">
                        {contact?.name ?? 'Unknown'}
                      </Link>
                      <p className="text-xs text-muted-foreground">{contact?.email}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.subject}</TableCell>
                    <TableCell>
                      <Link href={`/conversations/${e.conversationId}`} className="text-sm hover:underline">
                        {conv?.subject ?? 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">{statusBadges(e)}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(e.sentAt ?? e.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.openedAt ? formatDateShort(e.openedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.clickedAt ? formatDateShort(e.clickedAt) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
