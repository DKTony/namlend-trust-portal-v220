import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

export type PdfPurpose = 'view' | 'print' | 'download';

/**
 * Open, print or download an agreement PDF through a short-lived grant URL.
 * View/print open the print-ready PDF in a new tab (the browser's PDF viewer prints it);
 * the tab is opened synchronously on click so popup blockers allow it.
 */
export function useAgreementPdf() {
  const request = useMutation(api.loanAgreements.requestDocument);
  const { toast } = useToast();
  return useCallback(
    async (
      agreementId: Id<'loanAgreements'>,
      purpose: PdfPurpose,
      copy: 'issued' | 'executed' = 'issued'
    ) => {
      const tab = purpose === 'download' ? null : window.open('about:blank', '_blank');
      try {
        const url = await request({ agreementId, purpose, copy });
        if (purpose === 'download') {
          const a = document.createElement('a');
          a.href = url;
          a.rel = 'noopener';
          a.click();
        } else if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener');
        }
      } catch (error) {
        tab?.close();
        toast({
          title: 'Could not open the agreement',
          description: handleMutationError(error, 'Please try again.'),
          variant: 'destructive',
        });
      }
    },
    [request, toast]
  );
}
