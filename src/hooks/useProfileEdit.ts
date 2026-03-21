/**
 * useProfileEdit hook
 * Manages inline editing state for client profile sections.
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { monitorDatabaseError } from '@/utils/errorMonitoring';

interface UseProfileEditReturn {
  isEditing: boolean;
  editingSection: string | null;
  editForm: Record<string, any>;
  handleEditStart: (section: string, initialData: Record<string, any>) => void;
  handleEditCancel: () => void;
  handleEditSave: (userId: string, onSuccess: () => void) => Promise<void>;
  handleInputChange: (field: string, value: any) => void;
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
      // Map legacy Supabase field names to Convex camelCase fields
      await updateMyProfile({
        fullName:
          editForm.first_name && editForm.last_name
            ? `${editForm.first_name} ${editForm.last_name}`.trim()
            : editForm.fullName,
        phone: editForm.phone_number ?? editForm.phone,
        employmentStatus: editForm.employment_status ?? editForm.employmentStatus,
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
      monitorDatabaseError('update_profile', error);
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
