import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { AddContactDialog } from '@/components/add-contact-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { ContactsTable } from '@/components/contacts-table';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  await db();

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const contacts = await Contact.find(filter)
    .sort({ lastActivityAt: -1, createdAt: -1 })
    .limit(1000)
    .lean() as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <BulkImportDialog />
          <AddContactDialog />
        </div>
      </div>
      <ContactsTable
        contacts={contacts.map((c: any) => ({
          _id: c._id.toString(),
          name: c.name,
          email: c.email,
          status: c.status,
          lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
          activeConversation: null,
        }))}
      />
    </div>
  );
}
