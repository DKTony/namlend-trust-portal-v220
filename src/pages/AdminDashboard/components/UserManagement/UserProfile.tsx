import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings, 
  Edit,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Key,
  UserX,
  UserCheck,
  Loader2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

interface UserProfileProps {
  userId: string;
  onClose: () => void;
  onUserUpdated?: () => void;
}

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'loan_officer' | 'client' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  isVerified: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  loginCount: number;
  department?: string;
  address?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  notes?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose, onUserUpdated }) => {
  const { user, loading, error, updateUser, suspendUser, refetch } = useUserProfile(userId);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  // Mock user data for demonstration
  const mockUser: UserData = {
    id: userId,
    fullName: 'John Doe',
    email: 'john.doe@namlend.com',
    phone: '+264 81 123 4567',
    role: 'loan_officer',
    status: 'active',
    isVerified: true,
    lastLogin: '2024-01-15T10:30:00Z',
    createdAt: '2023-06-01T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    permissions: ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'],
    loginCount: 245,
    department: 'Loan Operations',
    address: '123 Independence Ave, Windhoek, Namibia',
    dateOfBirth: '1985-03-15',
    emergencyContact: '+264 81 987 6543',
    notes: 'Senior loan officer with excellent performance record.'
  };

  const userData = user || mockUser;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      suspended: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    };

    const icons = {
      active: <CheckCircle className="h-4 w-4 mr-1" />,
      inactive: <Clock className="h-4 w-4 mr-1" />,
      suspended: <AlertTriangle className="h-4 w-4 mr-1" />,
      pending: <Clock className="h-4 w-4 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      loan_officer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      client: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      support: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800'
    };

    const icons = {
      admin: <Shield className="h-3 w-3 mr-1" />,
      loan_officer: <User className="h-3 w-3 mr-1" />,
      client: <User className="h-3 w-3 mr-1" />,
      support: <Settings className="h-3 w-3 mr-1" />
    };

    const labels = {
      admin: 'Admin',
      loan_officer: 'Loan Officer',
      client: 'Client',
      support: 'Support'
    };

    return (
      <Badge variant="outline" className={variants[role as keyof typeof variants] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}>
        {icons[role as keyof typeof icons]}
        <span>{labels[role as keyof typeof labels] || role}</span>
      </Badge>
    );
  };

  const handleEdit = () => {
    setEditedUser({ ...userData });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedUser) return;
    
    setSaving(true);
    try {
      const success = await updateUser({
        fullName: editedUser.fullName,
        phone: editedUser.phone,
        isVerified: editedUser.isVerified
      });
      
      if (success) {
        toast({ title: 'Success', description: 'User profile updated successfully' });
        setIsEditing(false);
        refetch();
        onUserUpdated?.();
      } else {
        toast({ title: 'Error', description: 'Failed to update user profile', variant: 'destructive' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    setSaving(true);
    try {
      const success = await suspendUser();
      
      if (success) {
        toast({ title: 'User Suspended', description: 'User has been suspended successfully' });
        refetch();
        onUserUpdated?.();
      } else {
        toast({ title: 'Error', description: 'Failed to suspend user', variant: 'destructive' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to suspend';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(null);
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, status: newStatus as UserData['status'] });
    }
  };

  const handleRoleChange = (newRole: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, role: newRole as UserData['role'] });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-8 max-w-md w-full mx-4 border border-border">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">Error Loading User</h3>
            <p className="text-muted-foreground mb-4">{error || 'User not found'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = isEditing ? editedUser! : userData;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4 min-w-0 flex-1 mr-4">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold flex items-center truncate text-foreground">
                <span className="truncate" title={currentUser.fullName}>{currentUser.fullName}</span>
                {currentUser.isVerified && (
                  <CheckCircle className="h-5 w-5 text-green-500 ml-2 shrink-0" />
                )}
              </h2>
              <div className="flex items-center space-x-2 mt-1 overflow-x-auto no-scrollbar">
                <div className="shrink-0">{getStatusBadge(currentUser.status)}</div>
                <div className="shrink-0">{getRoleBadge(currentUser.role)}</div>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 shrink-0 tabular-nums">
                  ID: {currentUser.id.slice(0, 8)}...
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" onClick={handleSuspend} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-4 w-4 mr-2" />}
                  Suspend
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm text-muted-foreground truncate">Login Count</p>
                    <p className="text-2xl font-bold truncate tabular-nums text-foreground">{currentUser.loginCount}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm text-muted-foreground truncate">Last Login</p>
                    <p className="text-lg font-semibold truncate text-foreground">{formatDate(currentUser.lastLogin)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm text-muted-foreground truncate">Permissions</p>
                    <p className="text-2xl font-bold truncate tabular-nums text-foreground">{currentUser.permissions.length}</p>
                  </div>
                  <Key className="h-8 w-8 text-purple-600 dark:text-purple-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm text-muted-foreground truncate">Member Since</p>
                    <p className="text-lg font-semibold truncate text-foreground">{formatDate(currentUser.createdAt)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      {isEditing ? (
                        <Input
                          id="fullName"
                          value={currentUser.fullName}
                          onChange={(e) => setEditedUser(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                          className="bg-background border-input text-foreground"
                        />
                      ) : (
                        <p className="font-medium text-foreground">{currentUser.fullName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={currentUser.email}
                          onChange={(e) => setEditedUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="bg-background border-input text-foreground"
                        />
                      ) : (
                        <p className="font-medium text-foreground">{currentUser.email}</p>
                      )}
                    </div>
                    {currentUser.phone && (
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        {isEditing ? (
                          <Input
                            id="phone"
                            value={currentUser.phone}
                            onChange={(e) => setEditedUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            className="bg-background border-input text-foreground"
                          />
                        ) : (
                          <p className="font-medium text-foreground">{currentUser.phone}</p>
                        )}
                      </div>
                    )}
                    {currentUser.department && (
                      <div>
                        <Label htmlFor="department">Department</Label>
                        {isEditing ? (
                          <Input
                            id="department"
                            value={currentUser.department}
                            onChange={(e) => setEditedUser(prev => prev ? { ...prev, department: e.target.value } : null)}
                            className="bg-background border-input text-foreground"
                          />
                        ) : (
                          <p className="font-medium text-foreground">{currentUser.department}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Settings */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="role">Role</Label>
                      {isEditing ? (
                        <Select value={currentUser.role} onValueChange={handleRoleChange}>
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="loan_officer">Loan Officer</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div>{getRoleBadge(currentUser.role)}</div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      {isEditing ? (
                        <Select value={currentUser.status} onValueChange={handleStatusChange}>
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div>{getStatusBadge(currentUser.status)}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="verified">Email Verified</Label>
                      <Switch
                        id="verified"
                        checked={currentUser.isVerified}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => 
                          setEditedUser(prev => prev ? { ...prev, isVerified: checked } : null)
                        }
                      />
                    </div>
                    <div>
                      <Label>Account Created</Label>
                      <p className="text-sm text-muted-foreground">{formatDateTime(currentUser.createdAt)}</p>
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <p className="text-sm text-muted-foreground">{formatDateTime(currentUser.updatedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <textarea
                      className="w-full p-3 border border-input rounded-md focus:ring-2 focus:ring-ring bg-background text-foreground"
                      rows={4}
                      value={currentUser.notes || ''}
                      onChange={(e) => setEditedUser(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      placeholder="Add notes about this user..."
                    />
                  ) : (
                    <p className="text-muted-foreground">
                      {currentUser.notes || 'No notes available'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>User Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentUser.permissions.map(permission => (
                      <div key={permission} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="font-medium capitalize text-foreground">{permission.replace('_', ' ')}</span>
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Activity log will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <span className="font-medium text-foreground">Two-Factor Authentication</span>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <span className="font-medium text-foreground">Login Notifications</span>
                        <p className="text-sm text-muted-foreground">Get notified of new logins</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="pt-4">
                      <Button variant="outline" className="w-full">
                        Force Password Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
