'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function BulkImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [result, setResult] = useState<{
    total: number;
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
    valid: Array<{ name: string; email: string }>;
    invalidLines: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleParse() {
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entriesText: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Parse failed');
      return;
    }
    setResult(data);
    setStep('review');
  }

  async function handleImport() {
    if (!result) return;
    setImporting(true);
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: result.valid }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Import failed');
      setImporting(false);
      return;
    }
    toast.success(`Imported ${data.created} contacts`);
    setOpen(false);
    setText('');
    setStep('input');
    setResult(null);
    setImporting(false);
    router.refresh();
  }

  function resetDialog() {
    setText('');
    setStep('input');
    setResult(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Contacts</DialogTitle>
        </DialogHeader>
        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paste contacts (one per line)</Label>
              <Textarea
                rows={10}
                placeholder={`John Smith, john@example.com\nSarah Jones <sarah@example.com>\njohn@example.com`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Supports: Name &lt;email&gt;, Name, email, or just email
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!text.trim()}>
                Parse
              </Button>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-md bg-muted">
                <p className="text-muted-foreground">Total entries</p>
                <p className="text-lg font-bold">{result.total}</p>
              </div>
              <div className="p-3 rounded-md bg-emerald-50">
                <p className="text-emerald-700">Valid</p>
                <p className="text-lg font-bold text-emerald-700">{result.validCount}</p>
              </div>
              <div className="p-3 rounded-md bg-amber-50">
                <p className="text-amber-700">Duplicates</p>
                <p className="text-lg font-bold text-amber-700">{result.duplicateCount}</p>
              </div>
              <div className="p-3 rounded-md bg-red-50">
                <p className="text-red-700">Invalid</p>
                <p className="text-lg font-bold text-red-700">{result.invalidCount}</p>
              </div>
            </div>
            {result.invalidLines.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Invalid lines:</p>
                <div className="max-h-24 overflow-y-auto text-xs text-muted-foreground bg-muted rounded p-2">
                  {result.invalidLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || result.validCount === 0}>
                {importing ? 'Importing...' : `Import ${result.validCount} contacts`}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
