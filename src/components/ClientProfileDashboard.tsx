import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/utils/rpc';
import { monitorDatabaseError } from '@/utils/errorMonitoring';
import { cn } from '@/lib/utils';
import { 
  User, 
  MapPin, 
  Building, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Edit,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  Briefcase,
  Smartphone,
  Mail,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';

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
  const [eligibilitySource, setEligibilitySource] = useState<'RPC' | 'Derived'>('Derived');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtendedProfile>>({});

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchEligibility();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Fetch extended profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch document requirements
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
      setEligibilitySource('RPC');
    } else {
      console.warn('Eligibility RPC failed in ClientProfileDashboard:', result.error);
      setEligibilitySource('Derived');
    }
  };

  const getDocumentStatusIcon = (doc: DocumentRequirement) => {
    if (doc.is_verified) return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
    if (doc.is_submitted) return <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
    return <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />;
  };

  const getDocumentStatusText = (doc: DocumentRequirement) => {
    if (doc.is_verified) return 'Verified';
    if (doc.is_submitted) return 'Under Review';
    return 'Required';
  };

  const handleEditStart = (section: string) => {
    setEditingSection(section);
    setIsEditing(true);
    setEditForm(profile || {});
  };

  const handleEditCancel = () => {
    setEditingSection(null);
    setIsEditing(false);
    setEditForm({});
  };

  const handleEditSave = async () => {
    if (!user || !editForm) return;

    try {
      const allowedFields = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone_number: editForm.phone_number,
        monthly_income: editForm.monthly_income,
        employment_status: editForm.employment_status
      };

      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      console.log('Updating profile with data:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchProfileData();
      await fetchEligibility();
      
      setEditingSection(null);
      setIsEditing(false);
      setEditForm({});
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      monitorDatabaseError('update_profile', error);
    }
  };

  const handleInputChange = (field: keyof ExtendedProfile, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
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

  const completionPercent = eligibility?.profile_completion_percentage ?? profile.profile_completion_percentage;
  const isEligible = eligibility?.eligible ?? profile.loan_application_eligible;

  return (
    <div className="space-y-8 min-h-full">
      
      {/* Header / Identity Card */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <User className="h-64 w-64 text-foreground transform rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
           <div className="flex items-start gap-6">
              <div className="h-24 w-24 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shadow-inner">
                 <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                 <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
                    {profile.first_name} {profile.last_name}
                 </h1>
                 <p className="text-muted-foreground font-mono text-sm mb-4">ID: {profile.id_number}</p>
                 <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground px-3 py-1">
                       <Smartphone className="h-3 w-3 mr-2" />
                       {profile.phone_number}
                    </Badge>
                    <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground px-3 py-1">
                       <Mail className="h-3 w-3 mr-2" />
                       {user?.email}
                    </Badge>
                 </div>
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-4 min-w-[240px]">
              <div className="text-right w-full">
                 <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Profile Completion</span>
                    <span className="text-blue-500 font-medium">{completionPercent}%</span>
                 </div>
                 <Progress value={completionPercent} className="h-2 bg-muted" indicatorClassName="bg-blue-500" />
              </div>
              
              <div className={cn(
                "w-full p-4 rounded-xl border flex items-center justify-between",
                isEligible 
                  ? "bg-green-500/10 border-green-500/20" 
                  : "bg-yellow-500/10 border-yellow-500/20"
              )}>
                 <span className={cn("text-sm font-medium", isEligible ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400")}>
                    {isEligible ? "Loan Eligible" : "Action Required"}
                 </span>
                 {isEligible ? <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" /> : <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />}
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
           {[
             { id: 'overview', label: 'Overview', icon: User },
             { id: 'personal', label: 'Personal Details', icon: FileText },
             { id: 'employment', label: 'Employment', icon: Briefcase },
             { id: 'banking', label: 'Banking', icon: CreditCard },
             { id: 'documents', label: 'Documents', icon: ShieldCheck }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveSection(tab.id)}
               className={cn(
                 "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group",
                 activeSection === tab.id
                   ? "bg-card border-border text-foreground shadow-sm"
                   : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
               )}
             >
                <div className="flex items-center gap-3">
                   <tab.icon className={cn("h-5 w-5", activeSection === tab.id ? "text-blue-500" : "text-muted-foreground group-hover:text-foreground")} />
                   <span className="font-medium text-sm">{tab.label}</span>
                </div>
                {activeSection === tab.id && <ChevronRight className="h-4 w-4 text-blue-500" />}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
           
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="flex items-center gap-3 mb-4 text-muted-foreground">
                    <User className="h-5 w-5" />
                    <span className="text-xs uppercase tracking-wider font-medium">Profile Status</span>
                 </div>
                 <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums tracking-tight">{profile.profile_completion_percentage}%</span>
                    <span className="text-sm text-muted-foreground mb-1.5">complete</span>
                 </div>
                 <Progress value={profile.profile_completion_percentage} className="h-1.5 bg-muted" indicatorClassName="bg-blue-500" />
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="flex items-center gap-3 mb-4 text-muted-foreground">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs uppercase tracking-wider font-medium">Documents</span>
                 </div>
                 <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums tracking-tight">
                      {eligibility ? eligibility.verified_docs : documentRequirements.filter(d => d.is_verified).length}
                    </span>
                    <span className="text-muted-foreground text-2xl font-light mb-0.5">/</span>
                    <span className="text-2xl text-muted-foreground mb-0.5 tabular-nums">
                      {eligibility ? eligibility.required_docs : documentRequirements.filter(d => d.is_required).length}
                    </span>
                 </div>
                 <p className="text-xs text-muted-foreground">Verified documents</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
                 <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br", isEligible ? "from-green-500/5" : "from-yellow-500/5")} />
                 <div className="flex items-center gap-3 mb-4 text-muted-foreground">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-xs uppercase tracking-wider font-medium">Eligibility</span>
                 </div>
                 <div className="flex items-center gap-3 mt-2">
                    {isEligible ? (
                       <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                          <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
                       </div>
                    ) : (
                       <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shrink-0">
                          <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                       </div>
                    )}
                    <div className="min-w-0">
                       <p className={cn("text-lg font-bold truncate", isEligible ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-500")}>
                          {isEligible ? 'Eligible' : 'Ineligible'}
                       </p>
                       <p className="text-xs text-muted-foreground truncate">
                          {isEligible ? 'Ready for loan application' : 'Complete missing items'}
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Personal Details Section */}
          {activeSection === 'personal' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                 <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Personal Information
                 </h3>
                 {editingSection === 'personal' ? (
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" onClick={handleEditCancel} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                       <Button size="sm" onClick={handleEditSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                    </div>
                 ) : (
                    <Button variant="outline" size="sm" onClick={() => handleEditStart('personal')} className="border-border bg-background hover:bg-accent text-foreground">
                       <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                    </Button>
                 )}
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[
                   { label: 'First Name', field: 'first_name', value: profile.first_name },
                   { label: 'Last Name', field: 'last_name', value: profile.last_name },
                   { label: 'ID Number', field: 'id_number', value: profile.id_number },
                   { label: 'Phone Number', field: 'phone_number', value: profile.phone_number },
                 ].map((item) => (
                   <div key={item.field} className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</label>
                      {editingSection === 'personal' ? (
                         <input
                           type="text"
                           className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                           value={editForm[item.field as keyof ExtendedProfile] || ''}
                           onChange={(e) => handleInputChange(item.field as keyof ExtendedProfile, e.target.value)}
                         />
                      ) : (
                         <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg border border-transparent">
                            {item.value || <span className="text-muted-foreground italic">Not provided</span>}
                         </p>
                      )}
                   </div>
                 ))}
                 
                 <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email</label>
                    <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg border border-transparent opacity-60 cursor-not-allowed">
                       {user?.email}
                    </p>
                 </div>
              </div>
              
              <div className="px-6 py-4 bg-muted/30 border-t border-border">
                 <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Address details managed separately.
                 </p>
              </div>
            </div>
          )}

          {/* Employment Section */}
          {activeSection === 'employment' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                 <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    Employment Details
                 </h3>
                 {editingSection === 'employment' ? (
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" onClick={handleEditCancel} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                       <Button size="sm" onClick={handleEditSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                    </div>
                 ) : (
                    <Button variant="outline" size="sm" onClick={() => handleEditStart('employment')} className="border-border bg-background hover:bg-accent text-foreground">
                       <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                    </Button>
                 )}
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Employment Status</label>
                    {editingSection === 'employment' ? (
                       <select
                         className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                         value={editForm.employment_status || ''}
                         onChange={(e) => handleInputChange('employment_status', e.target.value)}
                       >
                          <option value="">Select Status</option>
                          <option value="employed">Employed</option>
                          <option value="self_employed">Self Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="retired">Retired</option>
                          <option value="student">Student</option>
                       </select>
                    ) : (
                       <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg capitalize">
                          {profile.employment_status || <span className="text-muted-foreground italic">Not provided</span>}
                       </p>
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Monthly Income</label>
                    {editingSection === 'employment' ? (
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <input
                            type="number"
                            className="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={editForm.monthly_income || ''}
                            onChange={(e) => handleInputChange('monthly_income', parseFloat(e.target.value) || 0)}
                          />
                       </div>
                    ) : (
                       <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg font-mono">
                          {profile.monthly_income ? formatNAD(profile.monthly_income) : <span className="text-muted-foreground italic">Not provided</span>}
                       </p>
                    )}
                 </div>

                 {[
                   { label: 'Employer Name', field: 'employer_name', value: profile.employer_name },
                   { label: 'Employer Phone', field: 'employer_phone', value: profile.employer_phone },
                   { label: 'Contact Person', field: 'employer_contact_person', value: profile.employer_contact_person },
                 ].map((item) => (
                   <div key={item.field} className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</label>
                      {editingSection === 'employment' ? (
                         <input
                           type="text"
                           className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                           value={editForm[item.field as keyof ExtendedProfile] || ''}
                           onChange={(e) => handleInputChange(item.field as keyof ExtendedProfile, e.target.value)}
                         />
                      ) : (
                         <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg">
                            {item.value || <span className="text-muted-foreground italic">Not provided</span>}
                         </p>
                      )}
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* Banking Section */}
          {activeSection === 'banking' && (
             <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                     <CreditCard className="h-5 w-5 text-blue-500" />
                     Banking Information
                  </h3>
                  {editingSection === 'banking' ? (
                     <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleEditCancel} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                        <Button size="sm" onClick={handleEditSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                     </div>
                  ) : (
                     <Button variant="outline" size="sm" onClick={() => handleEditStart('banking')} className="border-border bg-background hover:bg-accent text-foreground">
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                     </Button>
                  )}
               </div>

               <div className="p-6">
                  {/* Visual Credit Card - Keep Dark for Style */}
                  <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700/50 shadow-xl max-w-sm relative overflow-hidden text-white">
                     <div className="absolute top-0 right-0 p-8 opacity-5"><CreditCard className="h-32 w-32" /></div>
                     <div className="relative z-10 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                           <p className="font-bold text-zinc-400 text-sm tracking-widest truncate pr-8">{profile.bank_name || 'BANK NAME'}</p>
                           <Wallet className="h-6 w-6 text-zinc-500 shrink-0" />
                        </div>
                        <div>
                           <p className="font-mono text-xl text-white tracking-widest mb-2 truncate">
                              {profile.account_number ? `**** **** **** ${profile.account_number.slice(-4)}` : '**** **** **** ****'}
                           </p>
                           <p className="text-xs text-zinc-500 uppercase truncate">{profile.first_name} {profile.last_name}</p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {([
                       { label: 'Bank Name', field: 'bank_name', value: profile.bank_name },
                       { label: 'Account Number', field: 'account_number', value: profile.account_number },
                       { label: 'Branch Code', field: 'branch_code', value: profile.branch_code },
                       { label: 'Branch Name', field: 'branch_name', value: profile.branch_name },
                     ] as const).map((item) => (
                        <div key={item.field} className="space-y-2">
                           <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</label>
                           {editingSection === 'banking' ? (
                              <input
                                type="text"
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={(editForm[item.field] as string) || ''}
                                onChange={(e) => handleInputChange(item.field, e.target.value)}
                              />
                           ) : (
                              <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg truncate">
                                 {item.value || <span className="text-muted-foreground italic">Not provided</span>}
                              </p>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
             </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
             <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                   <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-500" />
                      Document Verification
                   </h3>
                   <Button size="sm" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border">
                      <Upload className="h-3.5 w-3.5 mr-2" /> Upload New
                   </Button>
                </div>

                <div className="p-6 space-y-4">
                   {documentRequirements.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl hover:border-muted-foreground/30 transition-colors group">
                         <div className="flex items-center gap-4">
                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-background border border-border", 
                               doc.is_verified ? "text-green-500" : doc.is_submitted ? "text-yellow-500" : "text-muted-foreground"
                            )}>
                               {doc.is_verified ? <CheckCircle className="h-5 w-5" /> : doc.is_submitted ? <AlertCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                            <div>
                               <p className="font-medium text-foreground capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0 rounded-md",
                                     doc.is_verified ? "bg-green-500/10 text-green-600 dark:text-green-400" : 
                                     doc.is_submitted ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" : 
                                     "bg-red-500/10 text-red-600 dark:text-red-400"
                                  )}>
                                     {getDocumentStatusText(doc)}
                                  </Badge>
                                  {doc.is_required && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-sm">Required</span>}
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.is_submitted ? (
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                                  <Eye className="h-4 w-4" />
                               </Button>
                            ) : (
                               <Button size="sm" variant="outline" className="h-8 text-xs bg-background border-border text-foreground hover:bg-accent">
                                  <Upload className="h-3 w-3 mr-1.5" /> Upload
                               </Button>
                            )}
                         </div>
                      </div>
                   ))}
                   
                   {!isEligible && (
                      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                         <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                         <div>
                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-1">Incomplete Profile</p>
                            <p className="text-xs text-yellow-600/80 dark:text-yellow-500/70">
                               Please upload all required documents marked with "Required" to unlock loan applications.
                            </p>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
