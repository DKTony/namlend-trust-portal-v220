/**
 * useProfileEdit hook
 * Manages inline editing state for client profile sections.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const handleEditSave = async (userId: string, onSuccess: () => void) => {
    if (!userId || !editForm) return;

    try {
      const allowedFields = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone_number: editForm.phone_number,
        monthly_income: editForm.monthly_income,
        employment_status: editForm.employment_status,
      };

      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', userId);

      if (error) throw error;

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
