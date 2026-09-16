'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { timeAgo } from '@/lib/utils';
import { Search } from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  email: string;
  status: string;
  lastActivityAt: string | null;
  activeConversation: string | null;
}

function statusBadge(status: string) {
  switch (status) {
    case 'BOUNCED':
      return <Badge variant="destructive">Bounced</Badge>;
    case 'REPLIED':
      return <Badge variant="success">Replied</Badge>;
    case 'UNSUBSCRIBED':
      return <Badge variant="warning">Unsubscribed</Badge>;
    default:
      return <Badge variant="secondary">Active</Badge>;
  }
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    router.push(`/contacts?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
        {q && (
          <Button type="button" variant="ghost" onClick={() => { setQ(''); router.push('/contacts'); }}>
            Clear
          </Button>
        )}
      </form>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No contacts found.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Active Conversation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>
                    <Link href={`/contacts/${c._id}`} className="font-medium hover:underline">
                      {c.name || <span className="text-muted-foreground italic">No name</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(c.lastActivityAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.activeConversation ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
