/**
 * Client Profile Dashboard
 * Displays user profile with editable sections.
 * Refactored: header, sidebar, and sections extracted to sub-components.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/utils/rpc';
import { monitorDatabaseError } from '@/utils/errorMonitoring';
import { useProfileEdit } from '@/hooks/useProfileEdit';
import { ClientProfileHeader } from '@/components/client/ClientProfileHeader';
import { ClientProfileSidebar } from '@/components/client/ClientProfileSidebar';
import { OverviewSection } from '@/components/client/sections/OverviewSection';
import { PersonalSection } from '@/components/client/sections/PersonalSection';
import { EmploymentSection } from '@/components/client/sections/EmploymentSection';
import { BankingSectionProfile } from '@/components/client/sections/BankingSection';
import { DocumentsSection } from '@/components/client/sections/DocumentsSection';

interface ExtendedProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  id_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  employer_name: string;
  employer_phone: string;
  employer_contact_person: string;
  employment_status: string;
  monthly_income: number;
  bank_name: string;
  account_number: string;
  branch_code: string;
  branch_name: string;
  profile_completion_percentage: number;
  loan_application_eligible: boolean;
  id_document_verified: boolean;
  bank_statements_verified: boolean;
  payslip_verified: boolean;
  documents_complete: boolean;
}

interface DocumentRequirement {
  id: string;
  document_type: string;
  is_required: boolean;
  is_submitted: boolean;
  is_verified: boolean;
  submission_date: string;
  verification_date: string;
  rejection_reason: string;
}

export default function ClientProfileDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    required_docs: number;
    verified_docs: number;
    profile_completion_percentage: number;
    missing_required_docs: string[];
  } | null>(null);

  const {
    editingSection,
    editForm,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    handleInputChange,
  } = useProfileEdit();

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchEligibility();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: docData, error: docError } = await supabase
        .from('document_verification_requirements')
        .select('*')
        .eq('user_id', user?.id)
        .order('document_type');

      if (docError) throw docError;
      setDocumentRequirements(docData || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      monitorDatabaseError('fetch_profile_data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibility = async () => {
    const result = await callRpc('check_loan_eligibility', {}, { timeoutMs: 2500, retries: 1 });
    if (result.ok) {
      const data = result.data;
      if (Array.isArray(data) && data.length > 0) {
        setEligibility(data[0] as any);
      } else if (data) {
        setEligibility(data as any);
      }
    }
  };

  const onEditSave = async () => {
    if (!user) return;
    await handleEditSave(user.id, () => {
      fetchProfileData();
      fetchEligibility();
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-sm">Loading profile data...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-zinc-500">Profile not found</div>;
  }

  const completionPercent =
    eligibility?.profile_completion_percentage ?? profile.profile_completion_percentage;
  const isEligible = eligibility?.eligible ?? profile.loan_application_eligible;

  return (
    <div className="space-y-8 min-h-full">
      <ClientProfileHeader
        profile={profile}
        email={user?.email}
        completionPercent={completionPercent}
        isEligible={isEligible}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <ClientProfileSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <div className="lg:col-span-3">
          {activeSection === 'overview' && (
            <OverviewSection
              profileCompletion={profile.profile_completion_percentage}
              verifiedDocs={
                eligibility
                  ? eligibility.verified_docs
                  : documentRequirements.filter((d) => d.is_verified).length
              }
              requiredDocs={
                eligibility
                  ? eligibility.required_docs
                  : documentRequirements.filter((d) => d.is_required).length
              }
              isEligible={isEligible}
            />
          )}

          {activeSection === 'personal' && (
            <PersonalSection
              profile={profile}
              email={user?.email}
              isEditing={editingSection === 'personal'}
              editForm={editForm}
              onEditStart={() => handleEditStart('personal', profile)}
              onEditCancel={handleEditCancel}
              onEditSave={onEditSave}
              onInputChange={handleInputChange}
            />
          )}

          {activeSection === 'employment' && (
            <EmploymentSection
              profile={profile}
              isEditing={editingSection === 'employment'}
              editForm={editForm}
              onEditStart={() => handleEditStart('employment', profile)}
              onEditCancel={handleEditCancel}
              onEditSave={onEditSave}
              onInputChange={handleInputChange}
            />
          )}

          {activeSection === 'banking' && (
            <BankingSectionProfile
              profile={profile}
              isEditing={editingSection === 'banking'}
              editForm={editForm}
              onEditStart={() => handleEditStart('banking', profile)}
              onEditCancel={handleEditCancel}
              onEditSave={onEditSave}
              onInputChange={handleInputChange}
            />
          )}

          {activeSection === 'documents' && (
            <DocumentsSection documentRequirements={documentRequirements} isEligible={isEligible} />
          )}
        </div>
      </div>
    </div>
  );
}
