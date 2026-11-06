/**
 * Replace drafting notes with final, approved wording by revising whole clauses. Creates
 * a NEW template version; the earlier version (including the verbatim source) is kept.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { AgreementTemplateContent } from '../../../../../convex/lib/agreement/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: { _id: Id<'agreementTemplates'>; version: number; content: AgreementTemplateContent };
  unresolved: { clause: number; text: string; resolution: string }[];
}

export function TemplateRevisionDialog({ open, onOpenChange, template, unresolved }: Props) {
  const reviseTemplate = useMutation(api.loanAgreements.reviseTemplate);
  const { toast } = useToast();
  const clauses = template.content.clauses.filter((c) =>
    unresolved.some((n) => n.clause === c.number)
  );
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTexts(
      Object.fromEntries(
        clauses.map((c) => [c.number, c.blocks[0]?.type === 'paragraph' ? c.blocks[0].text : ''])
      )
    );
    setSummary('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template._id]);

  const stillContains = (n: number) => {
    const note = unresolved.find((u) => u.clause === n);
    return Boolean(note && texts[n]?.includes(note.text));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await reviseTemplate({
        fromTemplateId: template._id,
        clauses: clauses.map((c) => ({ number: c.number, text: texts[c.number] ?? '' })),
        changeSummary: summary,
      });
      toast({
        title: `Version ${template.version + 1} created`,
        description: 'Review it, then approve it for customer issue.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Could not create the revision',
        description: handleMutationError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Revise Standard Terms (from version {template.version})</DialogTitle>
          <DialogDescription>
            Enter the final, legally approved wording. Nothing is suggested here: contractual text
            must come from OG Financial’s legal sign-off. Version {template.version} stays on record
            unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {clauses.map((c) => {
            const note = unresolved.find((u) => u.clause === c.number)!;
            return (
              <div key={c.number} className="space-y-2">
                <Label htmlFor={`clause-${c.number}`} className="text-sm font-semibold">
                  {c.number}. {c.title}
                </Label>
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="font-semibold">Drafting note to replace — {note.resolution}</p>
                  <p className="mt-1 italic">“{note.text}”</p>
                </div>
                <Textarea
                  id={`clause-${c.number}`}
                  rows={6}
                  value={texts[c.number] ?? ''}
                  onChange={(e) => setTexts((p) => ({ ...p, [c.number]: e.target.value }))}
                />
                {stillContains(c.number) && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    The drafting note is still in this clause, so the new version cannot be approved
                    yet.
                  </p>
                )}
              </div>
            );
          })}
          <div className="space-y-1.5">
            <Label htmlFor="change-summary">Change summary (recorded with the version)</Label>
            <Input
              id="change-summary"
              value={summary}
              maxLength={200}
              placeholder="e.g. Final privacy wording approved by legal on 12 Nov"
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !summary.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create version{' '}
            {template.version + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
