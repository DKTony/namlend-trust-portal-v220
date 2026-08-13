/**
 * Client Profile Dashboard
 * Displays user profile with editable sections.
 * Refactored: header, sidebar, and sections extracted to sub-components.
 */

import { ClientProfileHeader } from '@/components/client/ClientProfileHeader';
import { ClientProfileSidebar } from '@/components/client/ClientProfileSidebar';
import { BankingSectionProfile } from '@/components/client/sections/BankingSection';
import { DocumentsSection } from '@/components/client/sections/DocumentsSection';
import { EmploymentSection } from '@/components/client/sections/EmploymentSection';
import { OverviewSection } from '@/components/client/sections/OverviewSection';
import { PersonalSection } from '@/components/client/sections/PersonalSection';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { useProfileEdit } from '@/hooks/useProfileEdit';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

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

export default function ClientProfileDashboard() {
  const { user } = useAuth();
  const { hasFeature } = useEntitlements();
  const documentsEnabled = hasFeature('clientDocuments');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!documentsEnabled && activeSection === 'documents') setActiveSection('overview');
  }, [activeSection, documentsEnabled]);

  const {
    editingSection,
    editForm,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    handleInputChange,
  } = useProfileEdit();

  // Convex reactive query for user profile
  const rawProfile = useConvexQuery(api.users.getMyProfile);
  const loading = rawProfile === undefined;
  const { eligibility, isEligible } = useKYCEligibility();

  const profile: ExtendedProfile | null = useMemo(() => {
    if (!rawProfile) return null;
    const names = (rawProfile.fullName ?? '').split(' ');
    return {
      id: String(rawProfile._id ?? ''),
      user_id: rawProfile.userId ?? '',
      first_name: names[0] ?? '',
      last_name: names.slice(1).join(' ') ?? '',
      phone_number: rawProfile.phone ?? '',
      id_number: rawProfile.idNumber ?? '',
      address_line1: rawProfile.addressLine1 ?? '',
      address_line2: rawProfile.addressLine2 ?? '',
      city: rawProfile.city ?? '',
      postal_code: rawProfile.postalCode ?? '',
      country: rawProfile.country ?? 'Namibia',
      employer_name: rawProfile.employerName ?? '',
      employer_phone: rawProfile.employerPhone ?? '',
      employer_contact_person: rawProfile.employerContactPerson ?? '',
      employment_status: rawProfile.employmentStatus ?? '',
      monthly_income: rawProfile.monthlyIncome ?? 0,
      bank_name: rawProfile.bankName ?? '',
      account_number: rawProfile.accountNumber ?? '',
      branch_code: rawProfile.branchCode ?? '',
      branch_name: rawProfile.branchName ?? '',
      profile_completion_percentage: rawProfile.profileCompletionPercentage ?? 0,
      loan_application_eligible: rawProfile.loanApplicationEligible ?? false,
      id_document_verified: rawProfile.idDocumentVerified ?? false,
      bank_statements_verified: rawProfile.bankStatementsVerified ?? false,
      payslip_verified: rawProfile.payslipVerified ?? false,
      documents_complete: rawProfile.documentsComplete ?? false,
    };
  }, [rawProfile]);

  const onEditSave = async () => {
    if (!user) return;
    await handleEditSave(user.id, () => {
      // Convex reactivity handles refresh automatically
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
              verifiedDocs={eligibility ? eligibility.verified_docs : 0}
              requiredDocs={eligibility ? eligibility.required_docs : 2}
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

          {documentsEnabled && activeSection === 'documents' && <DocumentsSection />}
        </div>
      </div>
    </div>
  );
}
