'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

export default function DraftActions({
  draftId,
  conversationId: _conversationId,
}: {
  draftId: string;
  conversationId: string | null;
}) {
  const router = useRouter();

  async function deleteDraft() {
    if (!confirm('Delete this draft?')) return;
    const res = await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Draft deleted');
      router.refresh();
    }
  }

  function openDraft() {
    router.push(`/compose?draftId=${draftId}`);
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="icon" onClick={openDraft}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={deleteDraft}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
