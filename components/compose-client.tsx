'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Check, X } from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  email: string;
}

interface PreviewItem {
  key: string;
  contactId: string;
  conversationId: string | null;
  name: string;
  email: string;
  subject: string;
  body: string;
  eligible: boolean;
  reason: string | null;
}

interface ComposeContext {
  mode: 'new' | 'followup';
  conversations: Array<{
    id: string;
    subject: string;
    contact: { id: string; name: string; email: string };
  }>;
  draft: {
    id: string;
    subject: string;
    body: string;
    recipientIds: string[];
  } | null;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Progress {
  total: number;
  pending: number;
  processed: number;
  delivered: number;
  failed: number;
  bounced: number;
}

export default function ComposeClient({
  context,
  templates,
}: {
  context: ComposeContext;
  templates: Template[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<'compose' | 'preview' | 'sending' | 'done'>('compose');

  const [subject, setSubject] = useState(
    context.draft?.subject ??
      (context.mode === 'followup' && context.conversations.length === 1
        ? context.conversations[0].subject
        : '')
  );
  const [body, setBody] = useState(context.draft?.body ?? '');
  const [recipientIds, setRecipientIds] = useState<string[]>(
    context.draft?.recipientIds ?? []
  );

  const [contactSearch, setContactSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const keys =
    context.mode === 'followup'
      ? context.conversations.map((c) => c.id)
      : recipientIds;

  const title =
    context.mode === 'followup'
      ? context.conversations.length === 1
        ? 'Follow Up'
        : `Follow Up (${context.conversations.length} conversations)`
      : 'Compose Email';

  function handleSearchContacts(q: string) {
    setContactSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.contacts ?? []);
    }, 250);
  }

  function toggleContact(contact: Contact) {
    if (recipientIds.includes(contact._id)) {
      setRecipientIds((prev) => prev.filter((id) => id !== contact._id));
      setSelectedContacts((prev) => prev.filter((c) => c._id !== contact._id));
    } else {
      setRecipientIds((prev) => [...prev, contact._id]);
      setSelectedContacts((prev) => [...prev, contact]);
    }
  }

  function removeRecipient(id: string) {
    setRecipientIds((prev) => prev.filter((r) => r !== id));
    setSelectedContacts((prev) => prev.filter((c) => c._id !== id));
  }

  function applyTemplate(t: Template) {
    setSubject(t.subject);
    setBody(t.body);
    toast.success(`Template "${t.name}" applied`);
  }

  async function handlePreview() {
    if (keys.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/send/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, mode: context.mode, keys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Preview failed');
      setPreviewItems(data.items);
      setChecked(new Set(data.items.filter((i: PreviewItem) => i.eligible).map((i: PreviewItem) => i.key)));
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    const selectedKeys = [...checked];
    if (selectedKeys.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    setConfirmOpen(true);
  }

  async function doSend() {
    setConfirmOpen(false);
    setStep('sending');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, mode: context.mode, keys: [...checked] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      setBatchId(data.batchId);
      if (data.skipped?.length > 0) {
        toast.warning(`${data.skipped.length} emails skipped`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
      setStep('preview');
    }
  }

  useEffect(() => {
    if (step !== 'sending' || !batchId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/send/progress?batchId=${batchId}`);
        const data = await res.json();
        if (!cancelled) {
          setProgress(data);
          if (data.pending === 0) {
            clearInterval(timer);
            setStep('done');
          }
        }
      } catch {}
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, batchId]);

  async function handleSaveDraft() {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        body,
        recipientIds,
        conversationId:
          context.mode === 'followup' && context.conversations.length === 1
            ? context.conversations[0].id
            : null,
        draftId: context.draft?.id ?? null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Draft saved');
    } else {
      toast.error(data.error ?? 'Failed to save draft');
    }
  }

  const eligibleCount = previewItems.filter((i) => i.eligible).length;

  if (step === 'compose') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        {context.mode === 'followup' && context.conversations.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Sending to:</p>
              {context.conversations.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3" />
                  <span className="font-medium">{c.contact.name}</span>
                  <span className="text-muted-foreground">&lt;{c.contact.email}&gt;</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {context.mode === 'new' && (
          <div className="space-y-2">
            <Label>Recipients</Label>
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedContacts.map((c) => (
                  <Badge key={c._id} variant="secondary" className="gap-1">
                    {c.name || c.email}
                    <button onClick={() => removeRecipient(c._id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => handleSearchContacts(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.slice(0, 20).map((c) => (
                    <button
                      key={c._id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => {
                        toggleContact(c);
                        setContactSearch('');
                        setSearchResults([]);
                      }}
                    >
                      {recipientIds.includes(c._id) && <Check className="h-3 w-3 text-emerald-600" />}
                      <span className="font-medium">{c.name || 'Unknown'}</span>
                      <span className="text-muted-foreground">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{recipientIds.length} contact(s) selected</p>
          </div>
        )}

        {templates.length > 0 && (
          <div className="space-y-2">
            <Label>Templates</Label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Button key={t.id} variant="outline" size="sm" onClick={() => applyTemplate(t)}>
                  {t.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi [[Name]],&#10;&#10;Write your email here..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use <code>[[Name]]</code> to personalize with the contact&apos;s name.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handlePreview} disabled={busy || keys.length === 0}>
            {busy ? 'Generating...' : 'Preview Emails'}
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('compose')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Preview Emails</h1>
          <span className="text-muted-foreground text-sm">
            {checked.size} of {previewItems.length} selected
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChecked(new Set(previewItems.filter((i) => i.eligible).map((i) => i.key)))}
          >
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setChecked(new Set())}>
            Deselect All
          </Button>
        </div>

        <div className="space-y-3">
          {previewItems.map((item) => (
            <Card key={item.key} className={!item.eligible ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked.has(item.key)}
                    disabled={!item.eligible}
                    onCheckedChange={(v) => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(item.key);
                        else next.delete(item.key);
                        return next;
                      });
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.email}</span>
                      {!item.eligible && item.reason && (
                        <Badge variant="destructive">{item.reason}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1">{item.subject}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {item.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={checked.size === 0}>
            Send Selected ({checked.size})
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setChecked(new Set(previewItems.filter((i) => i.eligible).map((i) => i.key)));
              handleSend();
            }}
            disabled={eligibleCount === 0}
          >
            Send All ({eligibleCount})
          </Button>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Send</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              You are about to send <strong>{checked.size}</strong> email(s).
            </p>
            <p className="text-sm text-muted-foreground">Subject: {subject}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={doSend}>Send {checked.size} Email(s)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === 'sending') {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold">Sending...</h1>
        {progress ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {progress.processed} / {progress.total}
                </p>
                <p className="text-muted-foreground text-sm mt-1">emails processed</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
                <div className="p-3 rounded-md bg-emerald-50">
                  <p className="text-emerald-700 font-bold text-lg">{progress.delivered}</p>
                  <p className="text-emerald-700">Delivered</p>
                </div>
                <div className="p-3 rounded-md bg-amber-50">
                  <p className="text-amber-700 font-bold text-lg">{progress.pending}</p>
                  <p className="text-amber-700">Pending</p>
                </div>
                <div className="p-3 rounded-md bg-red-50">
                  <p className="text-red-700 font-bold text-lg">{progress.failed + progress.bounced}</p>
                  <p className="text-red-700">Failed</p>
                </div>
                <div className="p-3 rounded-md bg-blue-50">
                  <p className="text-blue-700 font-bold text-lg">{progress.total - progress.pending - progress.processed + progress.processed}</p>
                  <p className="text-blue-700">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground">Starting...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Sending Complete</h1>
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-emerald-600">
            <Check className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">All emails have been sent</p>
          </div>
          {progress && (
            <div className="grid grid-cols-3 gap-3 text-sm max-w-sm mx-auto">
              <div>
                <p className="font-bold text-lg">{progress.delivered}</p>
                <p className="text-muted-foreground">Delivered</p>
              </div>
              <div>
                <p className="font-bold text-lg">{progress.failed + progress.bounced}</p>
                <p className="text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="font-bold text-lg">{progress.total}</p>
                <p className="text-muted-foreground">Total</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/history')}>View History</Button>
            <Button variant="outline" onClick={() => router.push('/conversations')}>
              View Conversations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
