/**
 * The borrower's loan agreement (spec §7): review the final approved terms page by page,
 * download or print the PDF, and accept it. Nothing is re-entered — every value comes
 * from what the borrower already gave in their application and profile.
 */

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { AgreementDocument } from '@/components/agreement/AgreementDocument';
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  type AgreementStatusValue,
} from '@/components/agreement/agreementStatus';
import { convexErrorFields } from '@/components/agreement/errors';
import { useAgreementPdf } from '@/components/agreement/useAgreementPdf';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, Download, FileSignature, Loader2, PenLine, Printer } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Id } from '../../convex/_generated/dataModel';

export default function LoanAgreement() {
  const { id } = useParams<{ id: string }>();
  const agreement = useQuery(
    api.loanAgreements.getMyAgreement,
    id ? { loanId: id as Id<'loans'> } : 'skip'
  );
  const markViewed = useMutation(api.loanAgreements.markViewed);
  const openPdf = useAgreementPdf();
  const [accepting, setAccepting] = useState(false);
  const viewed = useRef<string | null>(null);
  const navigate = useNavigate();
  // Same client chrome as the loan page this is reached from.
  const onTabChange = (tab: string) => {
    if (tab === 'budget') return navigate('/budget');
    if (tab === 'documents') return navigate('/kyc');
    navigate('/dashboard', { state: { tab } });
  };
  const frame = (children: React.ReactNode) => (
    <DashboardLayout activeTab="loans" onTabChange={onTabChange} title="Loan Agreement">
      {children}
    </DashboardLayout>
  );

  // Record the first time the borrower opens it (spec lifecycle: "Viewed by Client").
  useEffect(() => {
    if (agreement && agreement.status === 'sent' && viewed.current !== agreement._id) {
      viewed.current = agreement._id;
      void markViewed({ agreementId: agreement._id });
    }
  }, [agreement, markViewed]);

  if (agreement === undefined) {
    return frame(
      <div className="flex items-center justify-center py-24" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Loading your agreement…</span>
      </div>
    );
  }
  if (agreement === null) {
    return frame(
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Loan agreement"
          backLink={id ? `/loans/${id}` : '/dashboard'}
          icon={<FileSignature className="h-6 w-6" />}
        />
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Your agreement is not available yet. You will be notified when it is ready to review.
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = agreement.status as AgreementStatusValue;
  const fullName = agreement.snapshot.fields.find((f) => f.key === 'fullName')?.value ?? '';

  return frame(
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Your loan agreement"
        description={`Agreement ${agreement.agreementNumber}`}
        backLink={`/loans/${id}`}
        icon={<FileSignature className="h-6 w-6" />}
        actions={
          <Badge variant="outline" className={cn('text-sm', AGREEMENT_STATUS_TONE[status])}>
            {AGREEMENT_STATUS_LABEL[status]}
          </Badge>
        }
      />

      {agreement.canAccept ? (
        <Alert className="border-primary/40 bg-primary/5">
          <PenLine className="h-4 w-4" />
          <AlertTitle>Please review and accept your agreement</AlertTitle>
          <AlertDescription>
            Read every page, including Schedule A with your repayment schedule. When you are ready,
            accept it below.
          </AlertDescription>
        </Alert>
      ) : agreement.acceptance ? (
        <Alert className="border-success/40 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle>
            Accepted on{' '}
            {new Date(agreement.acceptance.acceptedAt).toLocaleDateString('en-NA', {
              timeZone: 'Africa/Windhoek',
              dateStyle: 'long',
            })}
          </AlertTitle>
          <AlertDescription>
            {agreement.hasExecutedPdf
              ? 'Your signed copy is ready to download.'
              : 'Your signed copy is being prepared.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {agreement.canAccept && (
          <Button onClick={() => setAccepting(true)}>
            <PenLine className="mr-2 h-4 w-4" />
            Accept agreement
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!agreement.hasIssuedPdf}
          onClick={() => openPdf(agreement._id, 'download')}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          disabled={!agreement.hasIssuedPdf}
          onClick={() => openPdf(agreement._id, 'print')}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        {agreement.hasExecutedPdf && (
          <Button variant="outline" onClick={() => openPdf(agreement._id, 'download', 'executed')}>
            <Download className="mr-2 h-4 w-4" />
            Signed copy
          </Button>
        )}
      </div>

      <AgreementDocument
        template={agreement.template?.content ?? null}
        fields={agreement.snapshot.fields}
        schedule={agreement.snapshot.schedule}
        totals={agreement.snapshot.totals}
        agreementNumber={agreement.agreementNumber}
        templateVersion={agreement.template?.version}
        acceptance={agreement.acceptance}
      />

      <AcceptDialog
        open={accepting}
        onOpenChange={setAccepting}
        agreementId={agreement._id}
        agreementNumber={agreement.agreementNumber}
        statement={agreement.template?.content.scheduleAcceptance ?? ''}
        fullName={fullName}
      />
    </div>
  );
}

function AcceptDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: Id<'loanAgreements'>;
  agreementNumber: string;
  statement: string;
  fullName: string;
}) {
  const accept = useMutation(api.loanAgreements.accept);
  const { toast } = useToast();
  const [typedName, setTypedName] = useState('');
  const [idLast4, setIdLast4] = useState('');
  const [place, setPlace] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.open) {
      setTypedName('');
      setIdLast4('');
      setPlace('');
      setAgreed(false);
      setErrors({});
    }
  }, [props.open]);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await accept({
        agreementId: props.agreementId,
        typedName,
        idNumberLast4: idLast4,
        placeOfSigning: place,
        agreed,
      });
      toast({
        title: 'Agreement accepted',
        description: 'Thank you. Your signed copy will be available shortly.',
      });
      props.onOpenChange(false);
    } catch (error) {
      const fields = convexErrorFields(error);
      if (Object.keys(fields).length) setErrors(fields);
      else
        toast({
          title: 'Could not accept',
          description: handleMutationError(error, 'Please try again.'),
          variant: 'destructive',
        });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Accept agreement {props.agreementNumber}</DialogTitle>
          <DialogDescription>
            Your acceptance is recorded with the exact document you were shown.
          </DialogDescription>
        </DialogHeader>
        <blockquote className="rounded-md border-l-4 border-primary bg-muted/50 p-3 text-sm">
          {props.statement}
        </blockquote>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="typed-name">Type your full name</Label>
            <Input
              id="typed-name"
              autoComplete="name"
              value={typedName}
              placeholder={props.fullName}
              onChange={(e) => setTypedName(e.target.value)}
              aria-invalid={Boolean(errors.typedName)}
            />
            <p className="text-xs text-muted-foreground">
              As it appears on the agreement: {props.fullName}
            </p>
            {errors.typedName && <p className="text-xs text-destructive">{errors.typedName}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="id-last4">Last 4 characters of your ID</Label>
              <Input
                id="id-last4"
                inputMode="text"
                maxLength={4}
                value={idLast4}
                onChange={(e) => setIdLast4(e.target.value)}
                aria-invalid={Boolean(errors.idNumberLast4)}
              />
              {errors.idNumberLast4 && (
                <p className="text-xs text-destructive">{errors.idNumberLast4}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="place">Signed at (town / city)</Label>
              <Input
                id="place"
                autoComplete="address-level2"
                value={place}
                maxLength={80}
                onChange={(e) => setPlace(e.target.value)}
                aria-invalid={Boolean(errors.placeOfSigning)}
              />
              {errors.placeOfSigning && (
                <p className="text-xs text-destructive">{errors.placeOfSigning}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
            <Label htmlFor="agree" className="text-sm font-normal leading-snug">
              I have read the Standard Terms and Schedule A, the cost of credit and repayment
              schedule were disclosed to me, and I accept this agreement.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={saving}>
            Not now
          </Button>
          <Button
            onClick={submit}
            disabled={
              saving || !agreed || !typedName.trim() || idLast4.trim().length !== 4 || !place.trim()
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
