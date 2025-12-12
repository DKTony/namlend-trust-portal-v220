/**
 * User VPAs Hook
 * 
 * React Query hooks for managing user's VPA (Virtual Payment Address) records
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getUserVPAs,
  upsertUserVPA,
  deleteUserVPA,
  setDefaultVPA,
  validateVPA,
} from '@/services/ipsService';
import type {
  UserVPAsResult,
  UpsertVPAParams,
  UpsertVPAResult,
  IPSAdapterValidateVPAResponse,
} from '@/types/ips';

/**
 * Hook for fetching user's saved VPAs
 */
export function useUserVPAs(userId?: string) {
  return useQuery<UserVPAsResult>({
    queryKey: ['user-vpas', userId],
    queryFn: () => getUserVPAs(userId),
  });
}

/**
 * Hook for adding/updating a VPA
 */
export function useUpsertVPA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<UpsertVPAResult, Error, UpsertVPAParams>({
    mutationFn: upsertUserVPA,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'VPA Saved',
          description: `Payment address ${result.vpa_address} has been saved.`,
        });
        queryClient.invalidateQueries({ queryKey: ['user-vpas'] });
      } else {
        toast({
          title: 'Failed to Save VPA',
          description: result.message || 'Could not save payment address.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for deleting a VPA
 */
export function useDeleteVPA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ success: boolean; error?: string }, Error, string>({
    mutationFn: deleteUserVPA,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'VPA Removed',
          description: 'Payment address has been removed.',
        });
        queryClient.invalidateQueries({ queryKey: ['user-vpas'] });
      } else {
        toast({
          title: 'Failed to Remove VPA',
          description: result.error || 'Could not remove payment address.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for setting a VPA as default
 */
export function useSetDefaultVPA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ success: boolean; error?: string }, Error, string>({
    mutationFn: setDefaultVPA,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Default VPA Updated',
          description: 'Your default payment address has been updated.',
        });
        queryClient.invalidateQueries({ queryKey: ['user-vpas'] });
      } else {
        toast({
          title: 'Failed to Update Default',
          description: result.error || 'Could not update default payment address.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for validating a VPA
 */
export function useValidateVPA() {
  const { toast } = useToast();

  return useMutation<IPSAdapterValidateVPAResponse, Error, string>({
    mutationFn: validateVPA,
    onSuccess: (result, vpa) => {
      if (result.success && result.isValid) {
        toast({
          title: 'VPA Valid',
          description: result.accountHolderName 
            ? `Account holder: ${result.accountHolderName}`
            : `${vpa} is a valid payment address.`,
        });
      } else if (!result.isValid) {
        toast({
          title: 'Invalid VPA',
          description: result.errorMessage || 'This payment address is not valid.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Validation Error',
        description: error.message || 'Could not validate payment address.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get the default VPA from a list of VPAs
 */
export function getDefaultVPA(vpas: UserVPAsResult['vpas']): typeof vpas extends Array<infer T> ? T | undefined : undefined {
  if (!vpas || vpas.length === 0) return undefined;
  return vpas.find(vpa => vpa.is_default) || vpas[0];
}
