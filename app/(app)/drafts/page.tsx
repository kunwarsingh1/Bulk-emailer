import { db } from '@/lib/db';
import { Draft } from '@/models/draft';
import { Contact } from '@/models/contact';
import { formatDateShort } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DraftActions from '@/components/draft-actions';

export const dynamic = 'force-dynamic';

export default async function DraftsPage() {
  await db();

  const drafts = await Draft.find().sort({ updatedAt: -1 }).lean() as any[];

  const allContactIds = drafts.flatMap((d: any) =>
    d.recipientIds.map((id: any) => id.toString())
  );
  const uniqueContactIds = [...new Set(allContactIds)];
  const contacts = await Contact.find({ _id: { $in: uniqueContactIds } })
    .select('name email')
    .lean() as any[];
  const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Drafts</h1>

      {drafts.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No drafts yet.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((d: any) => {
            const recipientNames = d.recipientIds
              .map((id: any) => {
                const c = contactMap.get(id.toString());
                return c?.name || c?.email || 'Unknown';
              })
              .slice(0, 3);
            const extraCount = d.recipientIds.length - 3;

            return (
              <Card key={d._id.toString()}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{d.subject || '(No subject)'}</p>
                      {d.conversationId && <Badge variant="secondary">Follow-up</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {d.body.slice(0, 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recipientNames.join(', ')}
                      {extraCount > 0 && ` +${extraCount} more`} · Updated {formatDateShort(d.updatedAt)}
                    </p>
                  </div>
                  <DraftActions
                    draftId={d._id.toString()}
                    conversationId={d.conversationId?.toString() ?? null}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
