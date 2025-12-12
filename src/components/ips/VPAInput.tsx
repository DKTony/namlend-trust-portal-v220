/**
 * VPA Input Component
 * 
 * Input field for Virtual Payment Address with validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useValidateVPA } from '@/hooks/useUserVPAs';
import { isValidVPAFormat, getVPAProvider } from '@/services/ipsService';
import type { IPSAdapterValidateVPAResponse } from '@/types/ips';
import { cn } from '@/lib/utils';

interface VPAInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationResult?: (result: IPSAdapterValidateVPAResponse | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  showValidateButton?: boolean;
  autoValidate?: boolean;
  autoValidateDelay?: number;
  className?: string;
}

export function VPAInput({
  value,
  onChange,
  onValidationResult,
  placeholder = 'username@bank',
  disabled = false,
  required = false,
  error: externalError,
  label = 'Payment Address (VPA)',
  showValidateButton = true,
  autoValidate = false,
  autoValidateDelay = 1000,
  className,
}: VPAInputProps) {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationResult, setValidationResult] = useState<IPSAdapterValidateVPAResponse | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  
  const validateVPAMutation = useValidateVPA();

  // Format validation on change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().trim();
    onChange(newValue);
    
    // Reset validation state
    setValidationState('idle');
    setValidationResult(null);
    onValidationResult?.(null);
    
    // Check format
    if (newValue && !isValidVPAFormat(newValue)) {
      setFormatError('Invalid format. Use: username@provider');
    } else {
      setFormatError(null);
    }
  }, [onChange, onValidationResult]);

  // Auto-validate with debounce
  useEffect(() => {
    if (!autoValidate || !value || !isValidVPAFormat(value)) return;
    
    const timer = setTimeout(() => {
      handleValidate();
    }, autoValidateDelay);
    
    return () => clearTimeout(timer);
  }, [value, autoValidate, autoValidateDelay]);

  // Validate VPA
  const handleValidate = useCallback(async () => {
    if (!value || !isValidVPAFormat(value)) {
      setFormatError('Please enter a valid VPA format');
      return;
    }
    
    setValidationState('validating');
    setFormatError(null);
    
    try {
      const result = await validateVPAMutation.mutateAsync(value);
      setValidationResult(result);
      setValidationState(result.isValid ? 'valid' : 'invalid');
      onValidationResult?.(result);
    } catch {
      setValidationState('invalid');
      setValidationResult({
        success: false,
        isValid: false,
        errorMessage: 'Validation failed',
      });
    }
  }, [value, validateVPAMutation, onValidationResult]);

  const provider = value ? getVPAProvider(value) : null;
  const displayError = externalError || formatError || (validationState === 'invalid' ? validationResult?.errorMessage : null);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="vpa-input" className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="vpa-input"
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || validationState === 'validating'}
            data-testid="vpa-input"
            className={cn(
              'pr-10',
              displayError && 'border-red-500 focus-visible:ring-red-500',
              validationState === 'valid' && 'border-green-500 focus-visible:ring-green-500'
            )}
          />
          
          {/* Status icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validationState === 'validating' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {validationState === 'valid' && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {validationState === 'invalid' && (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        
        {showValidateButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={disabled || !value || !isValidVPAFormat(value) || validationState === 'validating'}
            data-testid="vpa-verify-button"
          >
            {validationState === 'validating' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Verify'
            )}
          </Button>
        )}
      </div>
      
      {/* Provider badge */}
      {provider && !displayError && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {provider.toUpperCase()}
          </Badge>
          {validationResult?.accountHolderName && (
            <span className="text-sm text-muted-foreground">
              {validationResult.accountHolderName}
            </span>
          )}
        </div>
      )}
      
      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-3 w-3" />
          {displayError}
        </div>
      )}
      
      {/* Help text */}
      {!displayError && validationState === 'idle' && (
        <p className="text-xs text-muted-foreground">
          Enter your bank payment address (e.g., yourname@fnb)
        </p>
      )}
    </div>
  );
}

export default VPAInput;
