import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Download,
  Eye,
  Users,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface ImportStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface ImportUser {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
}

interface UserImportWizardProps {
  onClose: () => void;
  onComplete: (users: ImportUser[]) => void;
}

const UserImportWizard: React.FC<UserImportWizardProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUsers, setImportUsers] = useState<ImportUser[]>([]);
  const [processing, setProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    valid: number;
    warnings: number;
    errors: number;
  }>({ valid: 0, warnings: 0, errors: 0 });

  const steps: ImportStep[] = [
    {
      id: 1,
      title: 'Upload File',
      description: 'Select and upload your CSV file',
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'Map Fields',
      description: 'Map CSV columns to user fields',
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'Validate Data',
      description: 'Review and validate user data',
      completed: currentStep > 3
    },
    {
      id: 4,
      title: 'Import Users',
      description: 'Complete the import process',
      completed: currentStep > 4
    }
  ];

  // Mock CSV data for demonstration
  const mockImportUsers: ImportUser[] = [
    {
      fullName: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+264 81 123 4567',
      role: 'client',
      department: 'N/A',
      status: 'valid',
      errors: [],
      warnings: []
    },
    {
      fullName: 'Jane Doe',
      email: 'jane.doe@namlend.com',
      phone: '+264 81 234 5678',
      role: 'loan_officer',
      department: 'Loan Operations',
      status: 'valid',
      errors: [],
      warnings: []
    },
    {
      fullName: 'Bob Johnson',
      email: 'invalid-email',
      role: 'client',
      status: 'error',
      errors: ['Invalid email format'],
      warnings: []
    },
    {
      fullName: 'Alice Wilson',
      email: 'alice.wilson@example.com',
      role: 'unknown_role',
      status: 'warning',
      errors: [],
      warnings: ['Unknown role, will default to client']
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && importFile) {
      // Simulate file processing
      setProcessing(true);
      setTimeout(() => {
        setImportUsers(mockImportUsers);
        const valid = mockImportUsers.filter(u => u.status === 'valid').length;
        const warnings = mockImportUsers.filter(u => u.status === 'warning').length;
        const errors = mockImportUsers.filter(u => u.status === 'error').length;
        setValidationResults({ valid, warnings, errors });
        setProcessing(false);
        setCurrentStep(2);
      }, 2000);
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete import
      onComplete(importUsers.filter(u => u.status !== 'error'));
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      valid: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    const icons = {
      valid: <CheckCircle className="h-3 w-3 mr-1" />,
      warning: <AlertTriangle className="h-3 w-3 mr-1" />,
      error: <X className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['full_name', 'email', 'phone', 'role', 'department'].join(','),
      ['John Doe', 'john.doe@example.com', '+264 81 123 4567', 'client', ''].join(','),
      ['Jane Smith', 'jane.smith@namlend.com', '+264 81 234 5678', 'loan_officer', 'Loan Operations'].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground">User Import Wizard</h2>
            <p className="text-muted-foreground">Import users from CSV file</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 
                  ${step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : currentStep === step.id 
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }
                `}>
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep === step.id ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload File */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Upload CSV File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="import-file">Select CSV File</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="bg-background border-input text-foreground"
                    />
                    {importFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                      <li>• Required columns: full_name, email, role</li>
                      <li>• Optional columns: phone, department</li>
                      <li>• Valid roles: admin, loan_officer, client, support</li>
                      <li>• First row should contain column headers</li>
                    </ul>
                  </div>

                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              {processing && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Processing file...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Map Fields */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Field Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CSV Column</Label>
                      <div className="space-y-2 mt-2">
                        <div className="p-2 bg-muted rounded text-foreground">full_name</div>
                        <div className="p-2 bg-muted rounded text-foreground">email</div>
                        <div className="p-2 bg-muted rounded text-foreground">phone</div>
                        <div className="p-2 bg-muted rounded text-foreground">role</div>
                        <div className="p-2 bg-muted rounded text-foreground">department</div>
                      </div>
                    </div>
                    <div>
                      <Label>Maps to Field</Label>
                      <div className="space-y-2 mt-2">
                        <Select defaultValue="fullName">
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fullName">Full Name</SelectItem>
                            <SelectItem value="firstName">First Name</SelectItem>
                            <SelectItem value="lastName">Last Name</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="email">
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="phone">
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="role">
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">Role</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="department">
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="department">Department</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Validate Data */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valid</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{validationResults.valid}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{validationResults.warnings}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Errors</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{validationResults.errors}</p>
                      </div>
                      <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>User Validation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {importUsers.map((user, index) => (
                      <div key={index} className="border border-border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-foreground">{user.fullName}</span>
                            <span className="text-muted-foreground">{user.email}</span>
                            {getStatusBadge(user.status)}
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                        
                        {user.errors.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Errors:</p>
                            <ul className="text-sm text-red-700 dark:text-red-400">
                              {user.errors.map((error, i) => (
                                <li key={i}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {user.warnings.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Warnings:</p>
                            <ul className="text-sm text-yellow-700 dark:text-yellow-400">
                              {user.warnings.map((warning, i) => (
                                <li key={i}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Import Users */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users to Import</p>
                        <p className="text-2xl font-bold text-foreground">{importUsers.filter(u => u.status !== 'error').length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Users with Errors (Skipped)</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{validationResults.errors}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="send-welcome" defaultChecked />
                      <Label htmlFor="send-welcome">Send welcome emails to new users</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="force-password-reset" defaultChecked />
                      <Label htmlFor="force-password-reset">Force password reset on first login</Label>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Users will be created with default passwords and will receive email invitations to set up their accounts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border px-6 py-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleNextStep}
              disabled={(currentStep === 1 && !importFile) || processing}
            >
              {currentStep === 4 ? 'Import Users' : 'Next'}
              {currentStep < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
              {currentStep === 4 && <Users className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserImportWizard;
