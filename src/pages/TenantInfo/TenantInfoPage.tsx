import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import type { DocumentAccessIntent, DocumentViewItem } from '@/types/documents';
import { useMutation, useQuery } from 'convex/react';
import {
  Building2,
  CalendarClock,
  Eye,
  FileCheck2,
  FileUp,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Id } from '../../../convex/_generated/dataModel';

type TenantDocumentType = 'namfisa_registration' | 'namra_taxpayer_certificate';

interface TenantDocument {
  id: string;
  documentType: TenantDocumentType;
  issuer: string;
  documentNumber?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileAvailable: boolean;
  effectiveAt?: number;
  issuedAt?: number;
  expiresAt?: number;
  version: number;
  isCurrent: boolean;
  uploadedAt: number;
  supersededAt?: number;
}

const DOCUMENT_DEFAULTS: Record<
  TenantDocumentType,
  {
    label: string;
    issuer: string;
    documentNumber: string;
    effectiveDate: string;
    issuedDate: string;
    expiryDate: string;
  }
> = {
  namfisa_registration: {
    label: 'NAMFISA Registration',
    issuer: 'Namibia Financial Institutions Supervisory Authority (NAMFISA)',
    documentNumber: '25/11/2366',
    effectiveDate: '2026-04-20',
    issuedDate: '2026-04-20',
    expiryDate: '2027-04-19',
  },
  namra_taxpayer_certificate: {
    label: 'NAMRA Taxpayer Certificate',
    issuer: 'Namibia Revenue Agency (NamRA)',
    documentNumber: '15848714',
    effectiveDate: '2025-11-06',
    issuedDate: '2025-12-17',
    expiryDate: '',
  },
};

function formatDate(value?: number) {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat('en-NA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function dateToTimestamp(value: string) {
  return value ? Date.parse(`${value}T00:00:00.000Z`) : undefined;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">
        {value || 'Not recorded'}
      </dd>
    </div>
  );
}

function licenceStatus(expiresAt?: number) {
  if (!expiresAt) return { label: 'Expiry not recorded', className: '' };
  const remaining = expiresAt - Date.now();
  if (remaining < 0)
    return { label: 'Expired', className: 'border-red-500/30 bg-red-500/10 text-red-700' };
  if (remaining < 90 * 86_400_000) {
    return {
      label: 'Renewal due soon',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    };
  }
  return { label: 'Active', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' };
}

function UploadDocumentDialog({ institutionId }: { institutionId?: Id<'institutions'> }) {
  const { toast } = useToast();
  const generateUploadUrl = useMutation(api.institutionDocuments.generateUploadUrl);
  const recordDocument = useMutation(api.institutionDocuments.recordDocument);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<TenantDocumentType>('namfisa_registration');
  const [file, setFile] = useState<File | null>(null);
  const [issuer, setIssuer] = useState(DOCUMENT_DEFAULTS.namfisa_registration.issuer);
  const [documentNumber, setDocumentNumber] = useState(
    DOCUMENT_DEFAULTS.namfisa_registration.documentNumber
  );
  const [effectiveDate, setEffectiveDate] = useState(
    DOCUMENT_DEFAULTS.namfisa_registration.effectiveDate
  );
  const [issuedDate, setIssuedDate] = useState(DOCUMENT_DEFAULTS.namfisa_registration.issuedDate);
  const [expiryDate, setExpiryDate] = useState(DOCUMENT_DEFAULTS.namfisa_registration.expiryDate);

  const changeType = (next: TenantDocumentType) => {
    const defaults = DOCUMENT_DEFAULTS[next];
    setType(next);
    setIssuer(defaults.issuer);
    setDocumentNumber(defaults.documentNumber);
    setEffectiveDate(defaults.effectiveDate);
    setIssuedDate(defaults.issuedDate);
    setExpiryDate(defaults.expiryDate);
    setFile(null);
  };

  const submit = async () => {
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'PDF required',
        description: 'Choose a PDF document.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Tenant documents must be 10 MB or smaller.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl({ institutionId });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('The document upload failed.');
      const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
      await recordDocument({
        institutionId,
        documentType: type,
        issuer: issuer.trim(),
        documentNumber: documentNumber.trim() || undefined,
        fileName: file.name,
        fileStorageId: storageId,
        effectiveAt: dateToTimestamp(effectiveDate),
        issuedAt: dateToTimestamp(issuedDate),
        expiresAt: dateToTimestamp(expiryDate),
      });
      toast({
        title: 'Tenant document saved',
        description: `${DOCUMENT_DEFAULTS[type].label} is now the current version.`,
      });
      setOpen(false);
      setFile(null);
    } catch (error) {
      toast({
        title: 'Could not save document',
        description: handleMutationError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2" data-testid="tenant-document-upload">
        <FileUp className="h-4 w-4" /> Upload or replace
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload tenant document</DialogTitle>
            <DialogDescription>
              A replacement creates a new current version. Previous versions remain retained.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Document type</Label>
              <Select
                value={type}
                onValueChange={(value) => changeType(value as TenantDocumentType)}
              >
                <SelectTrigger data-testid="tenant-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_DEFAULTS).map(([value, item]) => (
                    <SelectItem key={value} value={value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tenant-document-file">PDF file (maximum 10 MB)</Label>
              <Input
                id="tenant-document-file"
                data-testid="tenant-document-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tenant-document-issuer">Issuer</Label>
              <Input
                id="tenant-document-issuer"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tenant-document-number">Document or registration number</Label>
              <Input
                id="tenant-document-number"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tenant-effective-date">Effective date</Label>
              <Input
                id="tenant-effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tenant-issued-date">Issued date</Label>
              <Input
                id="tenant-issued-date"
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tenant-expiry-date">Expiry date (if applicable)</Label>
              <Input
                id="tenant-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={!file || !issuer.trim() || busy}
              data-testid="tenant-document-save"
            >
              {busy ? 'Saving…' : 'Save document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TenantInfoPage() {
  const params = useParams<{ institutionId?: string }>();
  const institutionId = params.institutionId as Id<'institutions'> | undefined;
  const tenant = useQuery(api.institutionDocuments.getTenantInfo, { institutionId });
  const documents = useQuery(api.institutionDocuments.listDocuments, {
    institutionId,
    includeHistory: true,
  }) as TenantDocument[] | undefined;
  const requestAccess = useMutation(api.institutionDocuments.requestDocumentAccess);
  const [preview, setPreview] = useState<DocumentViewItem | null>(null);

  const currentDocuments = useMemo(
    () => documents?.filter((document) => document.isCurrent) ?? [],
    [documents]
  );
  const history = useMemo(
    () => documents?.filter((document) => !document.isCurrent) ?? [],
    [documents]
  );

  if (tenant === undefined || documents === undefined) {
    return (
      <div className="p-6 text-sm text-muted-foreground" role="status">
        Loading Tenant Info…
      </div>
    );
  }

  const status = licenceStatus(tenant.regulatoryExpiresAt);
  const openDocument = (document: TenantDocument) => {
    setPreview({
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      fileAvailable: document.fileAvailable,
      status: 'approved',
      uploadedAt: document.uploadedAt,
      version: document.version,
      isCurrent: document.isCurrent,
    });
  };

  return (
    <div data-testid="tenant-info-page" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/og-financial-logo.svg"
            alt="OG Financial Services"
            className="h-16 w-auto max-w-[240px] object-contain"
          />
          <div className="hidden border-l pl-4 sm:block">
            <h1 className="text-xl font-semibold">Tenant Info</h1>
            <p className="text-sm text-muted-foreground">
              Registration, tax, contact, and regulatory evidence
            </p>
          </div>
        </div>
        {tenant.canManageDocuments && <UploadDocumentDialog institutionId={institutionId} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> {tenant.name}
                </CardTitle>
                <CardDescription>{tenant.legalName ?? tenant.name}</CardDescription>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Short code" value={tenant.shortCode} />
            <Detail label="BIPA registration" value={tenant.registrationNumber} />
            <Detail label="NAMFISA licence" value={tenant.regulatoryLicense} />
            <Detail label="Taxpayer ID" value={tenant.taxIdentificationNumber} />
            <Detail label="Tax type" value={tenant.taxType} />
            <Detail label="Principal officer" value={tenant.principalOfficer} />
            <Detail label="Licence effective" value={formatDate(tenant.regulatoryEffectiveAt)} />
            <Detail label="Licence expiry" value={formatDate(tenant.regulatoryExpiresAt)} />
            <Detail label="NAMRA effective" value={formatDate(tenant.taxEffectiveAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>Operational contact and clearly separated addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-primary" />
              <span>{tenant.contactPhone ?? 'Not recorded'}</span>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-primary" />
              <span className="break-all">{tenant.contactEmail ?? 'Not recorded'}</span>
            </div>
            <div className="flex gap-3">
              <Globe2 className="mt-0.5 h-4 w-4 text-primary" />
              <span className="break-all">{tenant.website ?? 'Not recorded'}</span>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">NAMFISA-licensed address</p>
                <p className="text-muted-foreground">
                  {tenant.licensedAddress ?? tenant.address ?? 'Not recorded'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Contact / office address</p>
                <p className="text-muted-foreground">{tenant.contactAddress ?? 'Not recorded'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="tenant-documents-title" className="space-y-4">
        <div>
          <h2 id="tenant-documents-title" className="text-lg font-semibold">
            Current regulatory documents
          </h2>
          <p className="text-sm text-muted-foreground">
            Files open through short-lived, audited access links.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(DOCUMENT_DEFAULTS) as TenantDocumentType[]).map((type) => {
            const document = currentDocuments.find((item) => item.documentType === type);
            const defaults = DOCUMENT_DEFAULTS[type];
            return (
              <Card key={type} data-testid={`tenant-document-${type}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCheck2 className="h-5 w-5 text-primary" /> {defaults.label}
                  </CardTitle>
                  <CardDescription>{document?.issuer ?? defaults.issuer}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document ? (
                    <>
                      <dl className="grid grid-cols-2 gap-3">
                        <Detail label="Number" value={document.documentNumber} />
                        <Detail label="Version" value={String(document.version)} />
                        <Detail label="Effective" value={formatDate(document.effectiveAt)} />
                        <Detail
                          label="Expires"
                          value={
                            document.expiresAt
                              ? formatDate(document.expiresAt)
                              : 'No expiry recorded'
                          }
                        />
                      </dl>
                      <Button
                        variant="outline"
                        onClick={() => openDocument(document)}
                        disabled={!document.fileAvailable}
                        className="w-full gap-2"
                      >
                        <Eye className="h-4 w-4" /> Preview document
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No current PDF has been uploaded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5" /> Retained document history
            </CardTitle>
            <CardDescription>
              Superseded records remain available for compliance and audit purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => openDocument(document)}
                className="flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium">
                    {DOCUMENT_DEFAULTS[document.documentType].label}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Version {document.version}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Superseded {formatDate(document.supersededAt)}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <DocumentPreviewDialog
        document={preview}
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
        requestAccess={(documentId: string, intent: DocumentAccessIntent) =>
          requestAccess({ documentId: documentId as Id<'institutionDocuments'>, intent })
        }
      />
    </div>
  );
}
