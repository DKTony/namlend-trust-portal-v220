/**
 * useProfileEdit hook
 * Manages inline editing state for client profile sections.
 */

import { api } from '@/integrations/convex/api';
import { monitorDatabaseError } from '@/utils/errorMonitoring';
import { useMutation } from 'convex/react';
import { useState } from 'react';

interface UseProfileEditReturn {
  isEditing: boolean;
  editingSection: string | null;
  editForm: Record<string, any>;
  handleEditStart: (section: string, initialData: Record<string, any>) => void;
  handleEditCancel: () => void;
  handleEditSave: (userId: string, onSuccess: () => void) => Promise<void>;
  handleInputChange: (field: string, value: any) => void;
}

/**
 * Send `undefined` rather than `''`. `handleEditStart` seeds `editForm` with the whole
 * mapped profile, in which every absent value is already `''`, so passing those through
 * would write empty strings over fields the user never touched — `ctx.db.patch` writes
 * whatever key it is given.
 */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function useProfileEdit(): UseProfileEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const updateMyProfile = useMutation(api.users.updateMyProfile);

  const handleEditStart = (section: string, initialData: Record<string, any>) => {
    setEditingSection(section);
    setIsEditing(true);
    setEditForm(initialData);
  };

  const handleEditCancel = () => {
    setEditingSection(null);
    setIsEditing(false);
    setEditForm({});
  };

  const handleEditSave = async (_userId: string, onSuccess: () => void) => {
    if (!editForm) return;

    try {
      // Map legacy Supabase field names to Convex camelCase fields.
      //
      // Every field the profile sections render as an editable input must appear here.
      // Until the loan-agreement work the banking and employer inputs were missing, so
      // "Save Changes" in those sections discarded the user's edits without an error.
      const firstNames = editForm.first_name ?? editForm.firstNames;
      const surname = editForm.last_name ?? editForm.surname;
      await updateMyProfile({
        fullName: firstNames && surname ? `${firstNames} ${surname}`.trim() : editForm.fullName,
        firstNames: text(firstNames),
        surname: text(surname),
        phone: text(editForm.phone_number ?? editForm.phone),
        addressLine1: text(editForm.address_line1 ?? editForm.addressLine1),
        addressLine2: text(editForm.address_line2 ?? editForm.addressLine2),
        city: text(editForm.city),
        postalCode: text(editForm.postal_code ?? editForm.postalCode),
        country: text(editForm.country),
        employmentStatus: text(editForm.employment_status ?? editForm.employmentStatus),
        employerName: text(editForm.employer_name ?? editForm.employerName),
        employerPhone: text(editForm.employer_phone ?? editForm.employerPhone),
        employerContactPerson: text(
          editForm.employer_contact_person ?? editForm.employerContactPerson
        ),
        employeeNumber: text(editForm.employee_number ?? editForm.employeeNumber),
        workAddress: text(editForm.work_address ?? editForm.workAddress),
        bankName: text(editForm.bank_name ?? editForm.bankName),
        accountNumber: text(editForm.account_number ?? editForm.accountNumber),
        accountHolderName: text(editForm.account_holder_name ?? editForm.accountHolderName),
        accountType: text(editForm.account_type ?? editForm.accountType),
        branchCode: text(editForm.branch_code ?? editForm.branchCode),
        branchName: text(editForm.branch_name ?? editForm.branchName),
        monthlyIncome:
          editForm.monthly_income != null
            ? Number(editForm.monthly_income)
            : editForm.monthlyIncome != null
              ? Number(editForm.monthlyIncome)
              : undefined,
      });

      setEditingSection(null);
      setIsEditing(false);
      setEditForm({});
      onSuccess();
    } catch (error) {
      console.error('Error updating profile:', error);
      monitorDatabaseError(
        'update_profile',
        error instanceof Error ? { message: error.message } : { message: String(error) }
      );
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  return {
    isEditing,
    editingSection,
    editForm,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    handleInputChange,
  };
}
