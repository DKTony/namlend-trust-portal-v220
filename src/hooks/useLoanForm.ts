import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { APR_LIMIT } from '@/constants/regulatory';

interface UserProfile {
  monthly_income: number | null;
  employment_status: string | null;
  credit_score: number | null;
}

export interface LoanFormData {
  amount: string;
  term: string;
  purpose: string;
  employment_status: string;
  monthly_income: string;
  monthly_expenses: string;
  existing_debt: string;
}

export interface LoanDetails {
  amount: number;
  term: number;
  interestRate: number;
  monthlyPayment: number;
  totalRepayment: number;
}

export function useLoanForm(userId: string | undefined) {
  // Convex reactive query replaces Supabase profile fetch
  const rawProfile = useQuery(api.users.getMyProfile);
  const profileLoading = userId ? rawProfile === undefined : false;

  // Map Convex profile to UserProfile shape (memoized to stabilize useEffect dep)
  const userProfile: UserProfile | null = useMemo(() => {
    if (!rawProfile) return null;
    return {
      monthly_income: rawProfile.monthlyIncome ?? null,
      employment_status: rawProfile.employmentStatus ?? null,
      credit_score: null, // credit score lives in a separate table
    };
  }, [rawProfile]);

  const [formData, setFormData] = useState<LoanFormData>({
    amount: '',
    term: '',
    purpose: '',
    employment_status: '',
    monthly_income: '',
    monthly_expenses: '',
    existing_debt: '',
  });

  const [loanDetails, setLoanDetails] = useState<LoanDetails>({
    amount: 0,
    term: 0,
    interestRate: 32, // 32% APR as per Namibian regulations
    monthlyPayment: 0,
    totalRepayment: 0,
  });

  // Pre-populate form when profile data loads
  useEffect(() => {
    if (!userProfile) return;

    if (userProfile.monthly_income && userProfile.monthly_income > 0) {
      setFormData((prev) => ({
        ...prev,
        monthly_income: userProfile.monthly_income!.toString(),
      }));
    }
    if (userProfile.employment_status) {
      setFormData((prev) => ({
        ...prev,
        employment_status: userProfile.employment_status!,
      }));
    }
  }, [userProfile]);

  const calculateLoanDetails = (amount: number, term: number) => {
    const principal = amount;
    // Use APR_LIMIT from regulatory constants instead of hardcoded value
    const annualRate = APR_LIMIT / 100; // Convert percentage to decimal
    const monthlyRate = annualRate / 12;

    // Handle edge case where term is 0 or rate is 0
    if (term <= 0 || monthlyRate <= 0) {
      setLoanDetails({
        amount: principal,
        term: 0,
        interestRate: APR_LIMIT,
        monthlyPayment: 0,
        totalRepayment: 0,
      });
      return;
    }

    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepayment = monthlyPayment * term;

    setLoanDetails({
      amount: principal,
      term,
      interestRate: APR_LIMIT,
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      totalRepayment: isNaN(totalRepayment) ? 0 : totalRepayment,
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'amount' || field === 'term') {
      // Parse values with NaN protection - use 0 as fallback for empty/invalid inputs
      const amount = field === 'amount' ? parseFloat(value) || 0 : parseFloat(formData.amount) || 0;
      const term = field === 'term' ? parseInt(value, 10) || 0 : parseInt(formData.term, 10) || 0;

      if (amount > 0 && term > 0) {
        calculateLoanDetails(amount, term);
      } else {
        // Clear loan details when inputs are invalid/empty to prevent stale calculations
        setLoanDetails({
          amount: 0,
          term: 0,
          interestRate: 32,
          monthlyPayment: 0,
          totalRepayment: 0,
        });
      }
    }
  };

  // Helper to check if profile has valid monthly income
  const hasProfileIncome = !!(userProfile?.monthly_income && userProfile.monthly_income > 0);

  return {
    formData,
    setFormData,
    loanDetails,
    userProfile,
    profileLoading,
    hasProfileIncome,
    calculateLoanDetails,
    handleFormChange,
  };
}
