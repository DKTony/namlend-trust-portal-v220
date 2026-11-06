/**
 * "Edit missing fields" — completes or corrects the borrower's details for the
 * agreement. Values are written to the borrower's PROFILE (the source record), so the
 * client's own profile and every future document see the same data.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { AgreementField } from '../../../../../convex/lib/agreement/types';
import {
  ACCOUNT_TYPES,
  AGREEMENT_FIELD_SOURCES,
  CORRECTABLE_PROFILE_FIELDS,
  PROFILE_FIELD_LABELS,
  validateProfileValue,
  type CorrectableProfileField,
} from '../../../../../convex/lib/agreement/validation';
import { convexErrorFields } from '@/components/agreement/errors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: Id<'loans'>;
  fields: AgreementField[];
  source: Record<CorrectableProfileField, string | null>;
  fullName: string | null;
}

export function BorrowerDetailsDialog({
  open,
  onOpenChange,
  loanId,
  fields,
  source,
  fullName,
}: Props) {
  const update = useMutation(api.loanAgreements.updateBorrowerDetails);
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [values, setValues] = useState<Partial<Record<CorrectableProfileField, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Profile columns behind the agreement fields that are currently missing.
  const missingColumns = useMemo(() => {
    const cols = new Set<CorrectableProfileField>();
    for (const f of fields) {
      if (f.category === 'application' && f.value === null) {
        for (const col of AGREEMENT_FIELD_SOURCES[f.key] ?? []) if (!source[col]) cols.add(col);
      }
    }
    return cols;
  }, [fields, source]);

  const shown = CORRECTABLE_PROFILE_FIELDS.filter((f) => showAll || missingColumns.has(f));

  useEffect(() => {
    if (!open) return;
    // Pre-fill current values. For missing name parts, SUGGEST a split of the full name
    // (last word = surname) for staff to confirm — it is never saved without review.
    const initial: Partial<Record<CorrectableProfileField, string>> = {};
    for (const f of CORRECTABLE_PROFILE_FIELDS) initial[f] = source[f] ?? '';
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (!source.surname && parts.length > 1) initial.surname = parts[parts.length - 1];
    if (!source.firstNames && parts.length > 1) initial.firstNames = parts.slice(0, -1).join(' ');
    setValues(initial);
    setErrors({});
    setShowAll(missingColumns.size === 0);
  }, [open, source, fullName, missingColumns.size]);

  const set = (f: CorrectableProfileField, v: string) => {
    setValues((prev) => ({ ...prev, [f]: v }));
    setErrors((prev) => ({ ...prev, [f]: '' }));
  };

  const submit = async () => {
    const changed: Partial<Record<CorrectableProfileField, string>> = {};
    const local: Record<string, string> = {};
    for (const f of shown) {
      const next = (values[f] ?? '').trim();
      if (next === (source[f] ?? '')) continue;
      const error = validateProfileValue(f, next);
      if (error) local[f] = error;
      else changed[f] = next;
    }
    if (Object.keys(local).length) return setErrors(local);
    if (!Object.keys(changed).length) return onOpenChange(false);
    setSaving(true);
    try {
      const { changed: saved } = await update({ loanId, values: changed });
      toast({
        title: 'Borrower details updated',
        description: `${saved.length} field(s) saved to the client profile.`,
      });
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = convexErrorFields(error);
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else
        toast({
          title: 'Could not save',
          description: handleMutationError(error, 'Please try again.'),
          variant: 'destructive',
        });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete borrower details</DialogTitle>
          <DialogDescription>
            Saved to the client’s profile — the source record — so the agreement and the profile
            always agree.
            {missingColumns.size > 0 &&
              ` ${missingColumns.size} field(s) need a value before the agreement can be finalized.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="show-all" className="text-sm font-normal">
            Show all borrower fields
          </Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((f) => {
            const locked = f === 'idNumber' && Boolean(source.idNumber);
            const missing = missingColumns.has(f);
            return (
              <div key={f} className="space-y-1.5">
                <Label htmlFor={`bd-${f}`} className="flex items-center gap-2">
                  {PROFILE_FIELD_LABELS[f]}
                  {missing && (
                    <span className="rounded bg-amber-100 px-1.5 text-[0.7rem] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      Missing
                    </span>
                  )}
                </Label>
                {f === 'accountType' ? (
                  <Select value={values[f] || undefined} onValueChange={(v) => set(f, v)}>
                    <SelectTrigger id={`bd-${f}`} aria-invalid={Boolean(errors[f])}>
                      <SelectValue placeholder="Choose account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`bd-${f}`}
                    value={values[f] ?? ''}
                    disabled={locked}
                    onChange={(e) => set(f, e.target.value)}
                    aria-invalid={Boolean(errors[f])}
                    aria-describedby={errors[f] ? `bd-${f}-error` : undefined}
                    className={missing && !values[f] ? 'border-amber-400' : undefined}
                  />
                )}
                {locked && (
                  <p className="text-xs text-muted-foreground">
                    On file from KYC — change through KYC review.
                  </p>
                )}
                {(f === 'surname' || f === 'firstNames') && !source[f] && values[f] && (
                  <p className="text-xs text-muted-foreground">
                    Suggested from the full name — please confirm.
                  </p>
                )}
                {errors[f] && (
                  <p id={`bd-${f}-error`} className="text-xs text-destructive">
                    {errors[f]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
