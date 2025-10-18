import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/utils/rpc';
import { monitorDatabaseError } from '@/utils/errorMonitoring';
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
  Download
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
    if (doc.is_verified) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (doc.is_submitted) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
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
      // Only update fields that ACTUALLY exist in the live profiles table
      // Based on live schema inspection: id, user_id, first_name, last_name, phone_number, 
      // id_number, employment_status, monthly_income, verified, created_at, updated_at,
      // credit_score, risk_category, last_login, version
      const allowedFields = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone_number: editForm.phone_number,
        monthly_income: editForm.monthly_income,
        employment_status: editForm.employment_status
        // REMOVED: employer_name, employer_phone, bank_name, branch_code, branch_name - don't exist in live DB
      };

      // Remove undefined fields
      const updateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      console.log('Updating profile with data:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile data
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
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-8">Profile not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {profile.first_name} {profile.last_name}
                </CardTitle>
                <p className="text-muted-foreground">Client ID: {profile.id_number}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <Progress value={(eligibility?.profile_completion_percentage ?? profile.profile_completion_percentage)} className="w-32" />
                <span className="text-sm font-medium">{eligibility?.profile_completion_percentage ?? profile.profile_completion_percentage}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={(eligibility?.eligible ?? profile.loan_application_eligible) ? 'default' : 'secondary'}>
                  {(eligibility?.eligible ?? profile.loan_application_eligible) ? 'Loan Eligible' : 'Incomplete Profile'}
                </Badge>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  Source: {eligibilitySource}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'personal', label: 'Personal Details' },
          { id: 'employment', label: 'Employment' },
          { id: 'banking', label: 'Banking' },
          { id: 'documents', label: 'Documents' }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeSection === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSection(tab.id)}
            className="flex-1"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.profile_completion_percentage}%</div>
              <p className="text-xs text-muted-foreground">Profile Complete</p>
              <Progress value={profile.profile_completion_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Document Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {eligibility ? (
                  <>
                    {eligibility.verified_docs}/{eligibility.required_docs}
                  </>
                ) : (
                  <>
                    {documentRequirements.filter(d => d.is_verified).length}/
                    {documentRequirements.filter(d => d.is_required).length}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Documents Verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loan Eligibility</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {(eligibility?.eligible ?? profile.loan_application_eligible) ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                )}
                <span className="font-medium">
                  {(eligibility?.eligible ?? profile.loan_application_eligible) ? 'Eligible' : 'Not Eligible'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(eligibility?.eligible ?? profile.loan_application_eligible) 
                  ? 'You can apply for loans' 
                  : 'Complete profile to apply'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personal Details Section */}
      {activeSection === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Personal Information
              {editingSection === 'personal' ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEditSave}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEditStart('personal')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.first_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.last_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.id_number || ''}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.id_number || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                {editingSection === 'personal' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.phone_number || ''}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.phone_number || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Contact Information
              </h4>
              <div className="text-sm text-muted-foreground mb-2">
                Address fields will be available in a future update
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment Section */}
      {activeSection === 'employment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Employment Information
              </span>
              {editingSection === 'employment' ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleEditCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleEditSave}>Save</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEditStart('employment')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employer Name</label>
                {editingSection === 'employment' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.employer_name || ''}
                    onChange={(e) => handleInputChange('employer_name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.employer_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employment Status</label>
                {editingSection === 'employment' ? (
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <p className="font-medium">{profile.employment_status || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Monthly Income</label>
                {editingSection === 'employment' ? (
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.monthly_income || ''}
                    onChange={(e) => handleInputChange('monthly_income', parseFloat(e.target.value) || 0)}
                    placeholder="Enter monthly income in NAD"
                  />
                ) : (
                  <p className="font-medium">
                    {profile.monthly_income ? formatNAD(profile.monthly_income) : 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employer Phone</label>
                {editingSection === 'employment' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.employer_phone || ''}
                    onChange={(e) => handleInputChange('employer_phone', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.employer_phone || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                {editingSection === 'employment' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.employer_contact_person || ''}
                    onChange={(e) => handleInputChange('employer_contact_person', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.employer_contact_person || 'Not provided'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banking Section */}
      {activeSection === 'banking' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Banking Information
              </span>
              {editingSection === 'banking' ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleEditCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleEditSave}>Save</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEditStart('banking')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                {editingSection === 'banking' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.bank_name || ''}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.bank_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                {editingSection === 'banking' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.account_number || ''}
                    onChange={(e) => handleInputChange('account_number', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">
                    {profile.account_number ? `****${profile.account_number.slice(-4)}` : 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch Code</label>
                {editingSection === 'banking' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.branch_code || ''}
                    onChange={(e) => handleInputChange('branch_code', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.branch_code || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch Name</label>
                {editingSection === 'banking' ? (
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.branch_name || ''}
                    onChange={(e) => handleInputChange('branch_name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.branch_name || 'Not provided'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      {activeSection === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Document Verification
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentRequirements.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDocumentStatusIcon(doc)}
                    <div>
                      <p className="font-medium capitalize">
                        {doc.document_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDocumentStatusText(doc)}
                        {doc.is_required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.is_submitted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`View ${doc.document_type.replace('_', ' ')} document`}
                        title={`View ${doc.document_type.replace('_', ' ')} document`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {!doc.is_submitted && (
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {!((eligibility?.eligible ?? profile.loan_application_eligible)) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium text-yellow-800">Complete Your Profile</p>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Upload all required documents to become eligible for loan applications.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
