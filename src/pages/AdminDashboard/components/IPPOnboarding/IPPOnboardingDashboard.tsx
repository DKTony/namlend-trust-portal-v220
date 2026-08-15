/**
 * IPP Onboarding Dashboard
 *
 * Admin dashboard component for managing IPP/IPS customer onboarding.
 * Allows admins to view onboarding status, initiate onboarding, and manage users.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { IPPOnboardingState, IPPPendingOnboardingUser } from '@/types/ips';
import {
  IPP_ONBOARDING_STATE_COLORS,
  IPP_ONBOARDING_STATE_LABELS,
  getIPPOnboardingProgress,
} from '@/types/ips';
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';

const PIN_SET_STATES = new Set<string>([
  'IPS_PIN_SET',
  'ALIAS_REGISTRATION_PENDING',
  'ALIAS_REGISTERED',
  'READY_FOR_IPP_PAYMENTS',
]);

function mapOnboardingUser(app: {
  userId: Id<'users'>;
  status: string;
  email?: string;
  fullName?: string;
  phone?: string;
  aliasAddr?: string;
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
}): IPPPendingOnboardingUser {
  const parts = (app.fullName ?? '').split(' ').filter(Boolean);
  return {
    user_id: String(app.userId),
    state: app.status as IPPOnboardingState,
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
    phone: app.phone,
    email: app.email,
    long_alias: app.aliasAddr,
    ips_pin_set: PIN_SET_STATES.has(app.status),
    last_step_completed: app.status,
    last_error_code: app.rejectionReason,
    started_at: new Date(app.createdAt).toISOString(),
    updated_at: new Date(app.updatedAt).toISOString(),
  };
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

function StatCard({ title, value, icon, description, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700  ',
    green: 'bg-green-50 text-green-700  ',
    yellow: 'bg-yellow-50 text-yellow-700  ',
    red: 'bg-red-50 text-red-700  ',
    gray: 'bg-gray-50 text-gray-700  ',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IPPOnboardingDashboard() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<IPPOnboardingState | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<IPPPendingOnboardingUser | null>(null);
  const [showInitiateDialog, setShowInitiateDialog] = useState(false);
  const [initiateUserId, setInitiateUserId] = useState('');
  const [initiateMobile, setInitiateMobile] = useState('');
  const [initiating, setInitiating] = useState(false);

  const applications = useConvexQuery(api.ips.ipsOnboarding.adminListOnboarding, {
    status: stateFilter === 'all' ? undefined : stateFilter,
    limit: 100,
  });
  const adminStartOnboarding = useConvexMutation(api.ips.ipsOnboarding.adminStartOnboarding);

  const users: IPPPendingOnboardingUser[] = useMemo(
    () => (applications ?? []).map(mapOnboardingUser),
    [applications]
  );
  const usersLoading = applications === undefined;

  const stats = useMemo(() => {
    const by_state: Partial<Record<IPPOnboardingState, number>> = {};
    for (const user of users) {
      by_state[user.state] = (by_state[user.state] ?? 0) + 1;
    }
    return {
      total_users: users.length,
      ipp_ready: users.filter((u) => u.state === 'READY_FOR_IPP_PAYMENTS').length,
      in_progress: users.filter(
        (u) =>
          u.state !== 'READY_FOR_IPP_PAYMENTS' &&
          u.state !== 'NOT_STARTED' &&
          u.state !== 'SUSPENDED' &&
          u.state !== 'DEREGISTERED'
      ).length,
      not_started: users.filter(
        (u) => u.state === 'NOT_STARTED' || u.state === 'DEVICE_BINDING_REQUIRED'
      ).length,
      suspended: users.filter((u) => u.state === 'SUSPENDED').length,
      with_errors: users.filter((u) => Boolean(u.last_error_code) || u.state === 'DEREGISTERED')
        .length,
      by_state,
    };
  }, [users]);

  const filteredUsers = users.filter((user: IPPPendingOnboardingUser) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone?.includes(search) ||
      user.long_alias?.toLowerCase().includes(search)
    );
  });

  const handleRefreshAll = () => {
    toast({
      title: 'Live data',
      description: 'This list updates automatically from Convex.',
    });
  };

  const handleInitiateOnboarding = async () => {
    if (!initiateUserId) {
      toast({
        title: 'User ID Required',
        description: 'Please enter a user ID to initiate onboarding.',
        variant: 'destructive',
      });
      return;
    }
    setInitiating(true);
    try {
      await adminStartOnboarding({
        userId: initiateUserId as Id<'users'>,
        mobileNumber: initiateMobile || undefined,
      });
      toast({
        title: 'Onboarding Initiated',
        description: 'User onboarding has been initiated successfully.',
      });
      setShowInitiateDialog(false);
      setInitiateUserId('');
      setInitiateMobile('');
    } catch (error) {
      toast({
        title: 'Initiation Failed',
        description: error instanceof Error ? error.message : 'Failed to initiate onboarding.',
        variant: 'destructive',
      });
    } finally {
      setInitiating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">IPP Onboarding</h2>
          <p className="text-muted-foreground">
            Manage customer IPP/IPS onboarding for instant payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast({
                title: 'SoV providers are per-application',
                description:
                  'Bank/wallet provider lists are fetched when a client reaches bank selection. There is no global provider refresh.',
              })
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            About Providers
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button size="sm" onClick={() => setShowInitiateDialog(true)}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Initiate Onboarding
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="IPP Ready"
          value={stats.ipp_ready}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description="Ready for payments"
          color="green"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress}
          icon={<Clock className="h-5 w-5" />}
          description="Onboarding in progress"
          color="yellow"
        />
        <StatCard
          title="Not Started"
          value={stats.not_started}
          icon={<Users className="h-5 w-5" />}
          color="gray"
        />
        <StatCard
          title="With Errors"
          value={stats.with_errors}
          icon={<AlertCircle className="h-5 w-5" />}
          description="Needs attention"
          color="red"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="overview">State Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or alias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={stateFilter}
                  onValueChange={(value) => setStateFilter(value as IPPOnboardingState | 'all')}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="DEVICE_BINDING_REQUIRED">Device Binding Required</SelectItem>
                    <SelectItem value="SOV_SELECTION_PENDING">Provider Selection</SelectItem>
                    <SelectItem value="VERIFICATION_PENDING">Verification Pending</SelectItem>
                    <SelectItem value="IPS_PIN_SETTING">Setting PIN</SelectItem>
                    <SelectItem value="ALIAS_REGISTRATION_PENDING">Alias Registration</SelectItem>
                    <SelectItem value="READY_FOR_IPP_PAYMENTS">IPP Ready</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Last Step</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: IPPPendingOnboardingUser) => {
                      const state = user.state as IPPOnboardingState;
                      return (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.first_name} {user.last_name}
                              </p>
                              {user.long_alias && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {user.long_alias}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-foreground">{user.email}</p>
                              <p className="text-muted-foreground">{user.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={IPP_ONBOARDING_STATE_COLORS[state]}>
                              {IPP_ONBOARDING_STATE_LABELS[state]}
                            </Badge>
                            {user.last_error_code && (
                              <Badge variant="destructive" className="ml-2">
                                Error: {user.last_error_code}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="w-24">
                              <Progress value={getIPPOnboardingProgress(state)} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {getIPPOnboardingProgress(state)}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {user.last_step_completed || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding State Distribution</CardTitle>
              <CardDescription>Overview of users by onboarding state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.by_state).map(([state, count]) => (
                  <div
                    key={state}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={IPP_ONBOARDING_STATE_COLORS[state as IPPOnboardingState]}>
                        {IPP_ONBOARDING_STATE_LABELS[state as IPPOnboardingState]}
                      </Badge>
                    </div>
                    <span className="text-lg font-semibold text-foreground">{Number(count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Flow Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Flow</CardTitle>
              <CardDescription>Steps in the IPP customer onboarding process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-full bg-blue-100 ">
                    <Smartphone className="h-5 w-5 text-blue-600 " />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">1. Device Binding</h4>
                    <p className="text-sm text-muted-foreground">
                      User's mobile device is bound to their account for security
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-full bg-purple-100 ">
                    <CreditCard className="h-5 w-5 text-purple-600 " />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">2. Provider & Account Selection</h4>
                    <p className="text-sm text-muted-foreground">
                      User selects their bank/wallet provider and links their account
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-full bg-amber-100 ">
                    <Shield className="h-5 w-5 text-amber-600 " />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">3. Verification & PIN Setup</h4>
                    <p className="text-sm text-muted-foreground">
                      Account verification and IPS PIN configuration
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-full bg-green-100 ">
                    <CheckCircle2 className="h-5 w-5 text-green-600 " />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">4. Alias Registration</h4>
                    <p className="text-sm text-muted-foreground">
                      User's VPA alias is registered with IPS for receiving payments
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Initiate Onboarding Dialog */}
      <Dialog open={showInitiateDialog} onOpenChange={setShowInitiateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate IPP Onboarding</DialogTitle>
            <DialogDescription>
              Start the IPP onboarding process for a user. The user must have completed KYC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">User ID</label>
              <Input
                placeholder="Enter user UUID"
                value={initiateUserId}
                onChange={(e) => setInitiateUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mobile Number (optional)
              </label>
              <Input
                placeholder="+264 81 234 5678"
                value={initiateMobile}
                onChange={(e) => setInitiateMobile(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If not provided, the user's profile phone number will be used.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitiateOnboarding} disabled={initiating}>
              {initiating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Initiate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Onboarding Details</DialogTitle>
            <DialogDescription>
              {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-foreground">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={IPP_ONBOARDING_STATE_COLORS[selectedUser.state]}>
                    {IPP_ONBOARDING_STATE_LABELS[selectedUser.state]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IPS PIN</p>
                  <p className="text-foreground">{selectedUser.ips_pin_set ? 'Set' : 'Not Set'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">VPA Alias</p>
                  <p className="text-foreground font-mono">
                    {selectedUser.long_alias || 'Not registered'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <Progress
                    value={getIPPOnboardingProgress(selectedUser.state)}
                    className="h-2 mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {getIPPOnboardingProgress(selectedUser.state)}% complete
                  </p>
                </div>
                {selectedUser.last_error_code && (
                  <div className="col-span-2 p-3 rounded-lg bg-red-50 ">
                    <p className="text-sm font-medium text-red-800 ">
                      Last Error: {selectedUser.last_error_code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IPPOnboardingDashboard;
