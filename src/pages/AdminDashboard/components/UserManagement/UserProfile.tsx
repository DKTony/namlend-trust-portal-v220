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
  UserCheck
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '../../hooks/useUserProfile';

interface UserProfileProps {
  userId: string;
  onClose: () => void;
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

const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose }) => {
  const { user, loading, error } = useUserProfile(userId);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserData | null>(null);

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
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const icons = {
      active: <CheckCircle className="h-4 w-4 mr-1" />,
      inactive: <Clock className="h-4 w-4 mr-1" />,
      suspended: <AlertTriangle className="h-4 w-4 mr-1" />,
      pending: <Clock className="h-4 w-4 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      loan_officer: 'bg-blue-100 text-blue-800 border-blue-200',
      client: 'bg-green-100 text-green-800 border-green-200',
      support: 'bg-orange-100 text-orange-800 border-orange-200'
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
      <Badge variant="outline" className={variants[role as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[role as keyof typeof icons]}
        <span>{labels[role as keyof typeof labels] || role}</span>
      </Badge>
    );
  };

  const handleEdit = () => {
    setEditedUser({ ...userData });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedUser) {
      // Here you would typically save to backend
      console.log('Saving user changes:', editedUser);
      setIsEditing(false);
      alert('User profile updated successfully!');
    }
  };

  const handleCancel = () => {
    setEditedUser(null);
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, status: newStatus as any });
    }
  };

  const handleRoleChange = (newRole: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, role: newRole as any });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading User</h3>
            <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = isEditing ? editedUser! : userData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                {currentUser.fullName}
                {currentUser.isVerified && (
                  <CheckCircle className="h-5 w-5 text-green-500 ml-2" />
                )}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(currentUser.status)}
                {getRoleBadge(currentUser.role)}
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  ID: {currentUser.id}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm">
                  <UserX className="h-4 w-4 mr-2" />
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Login Count</p>
                    <p className="text-2xl font-bold">{currentUser.loginCount}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Permissions</p>
                    <p className="text-2xl font-bold">{currentUser.permissions.length}</p>
                  </div>
                  <Key className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Account Age</p>
                    <p className="text-lg font-semibold">
                      {Math.floor((Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="text-sm font-semibold">{formatDateTime(currentUser.lastLogin)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
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
                <Card>
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
                        />
                      ) : (
                        <p className="font-medium">{currentUser.fullName}</p>
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
                        />
                      ) : (
                        <p className="font-medium">{currentUser.email}</p>
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
                          />
                        ) : (
                          <p className="font-medium">{currentUser.phone}</p>
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
                          />
                        ) : (
                          <p className="font-medium">{currentUser.department}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="role">Role</Label>
                      {isEditing ? (
                        <Select value={currentUser.role} onValueChange={handleRoleChange}>
                          <SelectTrigger>
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
                          <SelectTrigger>
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
                      <p className="text-sm text-gray-600">{formatDateTime(currentUser.createdAt)}</p>
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <p className="text-sm text-gray-600">{formatDateTime(currentUser.updatedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      value={currentUser.notes || ''}
                      onChange={(e) => setEditedUser(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      placeholder="Add notes about this user..."
                    />
                  ) : (
                    <p className="text-gray-600">
                      {currentUser.notes || 'No notes available'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentUser.permissions.map(permission => (
                      <div key={permission} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium capitalize">{permission.replace('_', ' ')}</span>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Activity log will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">Two-Factor Authentication</span>
                        <p className="text-sm text-gray-600">Add an extra layer of security</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">Login Notifications</span>
                        <p className="text-sm text-gray-600">Get notified of new logins</p>
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
