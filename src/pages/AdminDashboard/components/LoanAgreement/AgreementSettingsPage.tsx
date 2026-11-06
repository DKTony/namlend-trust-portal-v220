/**
 * Loan agreement configuration (spec §5, §10): the fixed company information printed on
 * every agreement, the authorised representative, the disbursement control and the
 * Standard Terms. Nothing here can reach a customer contract until it is approved, and
 * the readiness panel lists exactly what still blocks issue.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileSignature,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LenderDetails } from '../../../../../convex/lib/agreement/types';
import { TemplateRevisionDialog } from './TemplateRevisionDialog';

const LENDER_FIELDS: { key: keyof LenderDetails; label: string; required: boolean }[] = [
  { key: 'registeredName', label: 'Registered name', required: true },
  { key: 'tradingName', label: 'Trading as', required: false },
  { key: 'registrationNumber', label: 'Legal registration no.', required: true },
  { key: 'regulatoryNumber', label: 'Regulatory registration no.', required: true },
  { key: 'physicalAddress', label: 'Trading / physical address', required: true },
  { key: 'administrativeAddress', label: 'Administrative office address', required: false },
  { key: 'postalAddress', label: 'Postal address', required: true },
  { key: 'contactNumber', label: 'Contact number', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'website', label: 'Website', required: false },
  { key: 'jurisdiction', label: 'Jurisdiction', required: true },
];

interface FormState {
  lender: LenderDetails;
  representativeName: string;
  representativeDesignation: string;
  defaultRepaymentMethod: string;
  requireAcceptedAgreementForDisbursement: boolean;
}

export default function AgreementSettingsPage() {
  const data = useQuery(api.loanAgreements.getSettings, {});
  const save = useMutation(api.loanAgreements.saveSettings);
  const approve = useMutation(api.loanAgreements.approveSettings);
  const importTerms = useMutation(api.loanAgreements.importSourceTemplate);
  const approveTemplate = useMutation(api.loanAgreements.approveTemplate);
  const { toast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  const fromSettings = useMemo<FormState | null>(() => {
    if (!data) return null;
    const s = data.settings;
    return {
      lender: { ...(s?.lender ?? {}) },
      representativeName: s?.representativeName ?? '',
      representativeDesignation: s?.representativeDesignation ?? '',
      defaultRepaymentMethod: s?.defaultRepaymentMethod ?? '',
      requireAcceptedAgreementForDisbursement: s?.requireAcceptedAgreementForDisbursement ?? false,
    };
  }, [data]);
  useEffect(() => setForm(fromSettings), [fromSettings]);

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      toast({ title: success });
    } catch (error) {
      toast({
        title: 'Not completed',
        description: handleMutationError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  if (!data || !form) {
    return (
      <div className="flex items-center justify-center py-24" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(fromSettings);
  const blocking = data.issues.filter((i) => i.blocking);
  const latest = data.templates[0];
  const approvedTemplate = data.templates.find((t) => t.status === 'approved');
  const settingsApproved = Boolean(data.settings?.approvedAt);
  const missingRequired =
    LENDER_FIELDS.some((f) => f.required && !form.lender[f.key]?.trim()) ||
    !form.representativeName.trim() ||
    !form.representativeDesignation.trim();
  const emailDomainMismatch =
    /mgholding/i.test(form.lender.email ?? '') &&
    !/mg\s*holding/i.test(form.lender.registeredName ?? '');

  const setLender = (key: keyof LenderDetails, value: string) =>
    setForm((f) => f && { ...f, lender: { ...f.lender, [key]: value } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Agreement"
        description="Company information, representative and Standard Terms used on every customer agreement."
        icon={<FileSignature className="h-6 w-6" />}
      />

      <Card
        className={cn(
          blocking.length ? 'border-amber-300 dark:border-amber-800' : 'border-success/40'
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {blocking.length ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-success" />
            )}
            {blocking.length ? 'Agreements cannot be issued yet' : 'Ready to issue agreements'}
          </CardTitle>
          <CardDescription>
            Customer contracts are blocked until every item below is resolved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={approvedTemplate ? 'border-success/40 text-success' : ''}
            >
              Standard Terms:{' '}
              {approvedTemplate ? `v${approvedTemplate.version} approved` : 'not approved'}
            </Badge>
            <Badge
              variant="outline"
              className={settingsApproved ? 'border-success/40 text-success' : ''}
            >
              Company settings: {settingsApproved ? 'approved' : 'not approved'}
            </Badge>
            <Badge variant="outline">
              Origination fee (Credit Policy): {data.creditPolicyFees.originationFeePercent}%
            </Badge>
          </div>
          {data.issues.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {data.issues.map((i) => (
                <li
                  key={i.message}
                  className={cn(
                    'flex gap-2',
                    i.blocking ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      i.blocking ? 'text-amber-600' : 'text-muted-foreground'
                    )}
                  />
                  <span>
                    {i.message}
                    {i.code === 'FEES_NOT_SUPPORTED' && (
                      <>
                        {' '}
                        <Link
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          to="/admin/settings/credit-policy"
                        >
                          Open Credit Policy
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Standard Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Standard Terms and Conditions</CardTitle>
          <CardDescription>
            The 18 clauses and Schedule A wording, versioned. The supplied document is kept verbatim
            as version 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.templates.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                No terms loaded. Load them exactly as written in the supplied source document.
              </p>
              <Button
                disabled={busy !== null}
                onClick={() =>
                  run('import', () => importTerms({}), 'Standard Terms loaded as version 1')
                }
              >
                {busy === 'import' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Load terms from the source document
              </Button>
            </div>
          ) : (
            <>
              <ol className="divide-y divide-border rounded-md border border-border">
                {data.templates.map((t) => (
                  <li
                    key={t._id}
                    className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Version {t.version}{' '}
                        <span className="font-normal text-muted-foreground">
                          · {t.source === 'source_document' ? 'source document' : 'revision'}
                        </span>
                      </p>
                      {t.changeSummary && (
                        <p className="text-xs text-muted-foreground">{t.changeSummary}</p>
                      )}
                      {t.unresolvedNotes.length > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {t.unresolvedNotes.length} drafting note(s) in clause(s){' '}
                          {t.unresolvedNotes.map((n) => n.clause).join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit',
                        t.status === 'approved' && 'border-success/40 text-success'
                      )}
                    >
                      {t.status}
                    </Badge>
                  </li>
                ))}
              </ol>
              {latest && latest.status === 'draft' && (
                <div className="flex flex-wrap gap-2">
                  {latest.unresolvedNotes.length > 0 && (
                    <Button variant="outline" onClick={() => setRevising(true)}>
                      Replace drafting notes…
                    </Button>
                  )}
                  <Button
                    disabled={busy !== null || latest.unresolvedNotes.length > 0}
                    title={
                      latest.unresolvedNotes.length ? 'Replace the drafting notes first' : undefined
                    }
                    onClick={() =>
                      run(
                        'approve-terms',
                        () => approveTemplate({ templateId: latest._id }),
                        `Version ${latest.version} approved`
                      )
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve version {latest.version} for issue
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Company information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Company information</CardTitle>
              <CardDescription>
                Printed in the agreement header and Schedule A. Editing withdraws approval.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setForm(
                  (f) =>
                    f && {
                      ...f,
                      lender: { ...f.lender, ...data.sourceDefaults.lender },
                      defaultRepaymentMethod:
                        f.defaultRepaymentMethod || data.sourceDefaults.defaultRepaymentMethod,
                    }
                )
              }
            >
              <FileDown className="mr-2 h-4 w-4" />
              Fill from source document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {LENDER_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`lender-${f.key}`}>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={`lender-${f.key}`}
                  value={form.lender[f.key] ?? ''}
                  onChange={(e) => setLender(f.key, e.target.value)}
                />
                {f.key === 'website' && !form.lender.website && (
                  <p className="text-xs text-muted-foreground">
                    The source document shows “[insert]” here. Leave blank to print “—”.
                  </p>
                )}
                {f.key === 'email' && emailDomainMismatch && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This address’s domain doesn’t match the registered name — please confirm it is
                    correct.
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rep-name">
                Authorised representative<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="rep-name"
                value={form.representativeName}
                onChange={(e) => setForm((f) => f && { ...f, representativeName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-designation">
                Designation<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="rep-designation"
                value={form.representativeDesignation}
                onChange={(e) =>
                  setForm((f) => f && { ...f, representativeDesignation: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repayment">Default repayment method</Label>
              <Input
                id="repayment"
                value={form.defaultRepaymentMethod}
                onChange={(e) =>
                  setForm((f) => f && { ...f, defaultRepaymentMethod: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch
              id="gate"
              checked={form.requireAcceptedAgreementForDisbursement}
              onCheckedChange={(v) =>
                setForm((f) => f && { ...f, requireAcceptedAgreementForDisbursement: v })
              }
            />
            <div>
              <Label htmlFor="gate">Require an accepted agreement before disbursement</Label>
              <p className="text-xs text-muted-foreground">
                When on, a loan cannot be disbursed until the borrower has accepted its agreement.
              </p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Fees</p>
            <p className="text-muted-foreground">
              Read from Credit Policy, the single fee configuration: origination{' '}
              {data.creditPolicyFees.originationFeePercent}%, late payment{' '}
              {data.creditPolicyFees.latePaymentFeePercent}%.{' '}
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                to="/admin/settings/credit-policy"
              >
                Edit in Credit Policy
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!dirty || busy !== null}
              onClick={() =>
                run(
                  'save',
                  () =>
                    save({
                      lender: form.lender,
                      representativeName: form.representativeName,
                      representativeDesignation: form.representativeDesignation,
                      defaultRepaymentMethod: form.defaultRepaymentMethod,
                      requireAcceptedAgreementForDisbursement:
                        form.requireAcceptedAgreementForDisbursement,
                    }),
                  'Settings saved — approve them to use on agreements'
                )
              }
            >
              {busy === 'save' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              disabled={
                dirty || !data.settings || settingsApproved || missingRequired || busy !== null
              }
              title={
                dirty ? 'Save first' : missingRequired ? 'Complete the required fields' : undefined
              }
              onClick={() => run('approve', () => approve({}), 'Settings approved')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {settingsApproved ? 'Approved' : 'Approve settings'}
            </Button>
          </div>
          {!settingsApproved && data.settings && (
            <Alert>
              <AlertTitle>Awaiting approval</AlertTitle>
              <AlertDescription>
                Saved settings are not used on any agreement until an administrator approves them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {latest && latest.status === 'draft' && latest.unresolvedNotes.length > 0 && (
        <TemplateRevisionDialog
          open={revising}
          onOpenChange={setRevising}
          template={latest}
          unresolved={latest.unresolvedNotes}
        />
      )}
    </div>
  );
}
