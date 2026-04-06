/**
 * User VPA hooks backed by the live Convex IPP implementation.
 *
 * `ipsAliasDirectory` is the primary source; `vpaRegistry` is only surfaced as
 * a compatibility fallback through `api.ips.ipsVpa.*`.
 */

import { useCallback, useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type {
  UserVPAsResult,
  UpsertVPAParams,
  UpsertVPAResult,
  IPSAdapterValidateVPAResponse,
} from '@/types/ips';

export function useUserVPAs() {
  const raw = useQuery(api.ips.ipsVpa.getMySavedVpas, {});

  const data = useMemo<UserVPAsResult>(() => {
    if (!raw) {
      return { success: true, vpas: [] };
    }
    return raw;
  }, [raw]);

  return {
    data,
    isLoading: raw === undefined,
    error: null,
  };
}

export function useUpsertVPA() {
  const { toast } = useToast();
  const upsertVpa = useMutation(api.ips.ipsVpa.upsertVpa);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (params: UpsertVPAParams) => {
      setIsPending(true);
      try {
        const result = (await upsertVpa({
          vpaAddress: params.vpaAddress,
          displayName: params.displayName,
          setDefault: params.setDefault,
        })) as UpsertVPAResult;

        toast({
          title: 'VPA Saved',
          description: result.message ?? `${params.vpaAddress} has been saved.`,
        });

        return result;
      } catch (error: any) {
        const message = error?.data?.message ?? error?.message ?? 'Could not save payment address.';
        toast({
          title: 'Failed to Save VPA',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message, message } as UpsertVPAResult;
      } finally {
        setIsPending(false);
      }
    },
    [toast, upsertVpa]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useDeleteVPA() {
  const { toast } = useToast();
  const deleteVpa = useMutation(api.ips.ipsVpa.deleteVpa);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (vpaId: string, source?: 'alias_directory' | 'legacy_registry') => {
      setIsPending(true);
      try {
        const result = await deleteVpa({ vpaId, source });
        toast({ title: 'VPA Removed', description: 'Payment address has been removed.' });
        return result;
      } catch (error: any) {
        const message =
          error?.data?.message ?? error?.message ?? 'Could not remove payment address.';
        toast({
          title: 'Failed to Remove VPA',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      } finally {
        setIsPending(false);
      }
    },
    [deleteVpa, toast]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useSetDefaultVPA() {
  const { toast } = useToast();
  const setDefaultVpa = useMutation(api.ips.ipsVpa.setDefaultVpa);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (vpaId: string, source?: 'alias_directory' | 'legacy_registry') => {
      setIsPending(true);
      try {
        const result = await setDefaultVpa({ vpaId, source });
        toast({
          title: 'Default VPA Updated',
          description: 'Your default payment address has been updated.',
        });
        return result;
      } catch (error: any) {
        const message =
          error?.data?.message ?? error?.message ?? 'Could not update default address.';
        toast({
          title: 'Failed to Update Default',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      } finally {
        setIsPending(false);
      }
    },
    [setDefaultVpa, toast]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useValidateVPA() {
  const { toast } = useToast();
  const validateVpa = useAction(api.ips.ipsVpa.validateVpa);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (vpa: string) => {
      setIsPending(true);
      try {
        const result = (await validateVpa({ vpa })) as IPSAdapterValidateVPAResponse;

        if (result.validationStatus === 'validated') {
          toast({
            title: 'VPA Valid',
            description:
              (result.accountHolderName ?? result.providerName)
                ? `${result.accountHolderName ?? result.resolvedVpa ?? vpa} is available.`
                : `${result.resolvedVpa ?? vpa} is valid.`,
          });
        } else if (result.validationStatus === 'pending') {
          toast({
            title: 'Validation Pending',
            description:
              result.errorMessage ??
              'IPS accepted the request, but the directory response has not arrived yet.',
          });
        } else {
          toast({
            title: 'Unable to Validate VPA',
            description: result.errorMessage ?? 'The payment address could not be validated.',
            variant: 'destructive',
          });
        }

        return result;
      } catch (error: any) {
        const message = error?.data?.message ?? error?.message ?? 'Validation failed.';
        toast({ title: 'Validation Error', description: message, variant: 'destructive' });
        return {
          success: false,
          isValid: false,
          validationStatus: 'invalid',
          error: 'UNEXPECTED_ERROR',
          errorCode: 'UNEXPECTED_ERROR',
          errorMessage: message,
        } satisfies IPSAdapterValidateVPAResponse;
      } finally {
        setIsPending(false);
      }
    },
    [toast, validateVpa]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function getDefaultVPA(vpas: UserVPAsResult['vpas']) {
  if (!vpas?.length) return undefined;
  return (
    vpas.find((vpa) => vpa.is_default && vpa.is_usable !== false) ??
    vpas.find((vpa) => vpa.is_usable !== false) ??
    vpas[0]
  );
}
