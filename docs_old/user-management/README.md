# User Management System Documentation

## Overview

The User Management System is a comprehensive administrative portal that provides centralized user management and access control capabilities for the NamLend platform. This system enables administrators to efficiently manage user accounts, roles, permissions, and monitor user activities.

## Features

### 1. User Profile Management

- **Component**: `UserProfile.tsx`
- **Hook**: `useUserProfile.ts`
- **Features**:
  - Detailed user profile viewing and editing
  - Role assignment and status management
  - Tabbed interface for Overview, Permissions, Activity, and Security
  - Real-time profile updates with loading states

### 2. User List Management

- **Component**: `UsersList.tsx`
- **Hook**: `useUsersList.ts`
- **Features**:
  - Comprehensive user listing with search and filtering
  - Role-based badges and status indicators
  - Bulk selection capabilities
  - Quick actions (view, edit, delete, suspend)
  - KYC status tracking

### 3. Role Management

- **Component**: `RoleManagement.tsx`
- **Features**:
  - Create, edit, and delete user roles
  - Permission assignment to roles
  - System vs custom role distinction
  - Role hierarchy and inheritance

### 4. Permission Matrix

- **Component**: `PermissionMatrix.tsx`
- **Features**:
  - Granular permission management
  - Risk level categorization (Low, Medium, High, Critical)
  - Permission categories (User Management, Financial, System, etc.)
  - Visual permission matrix interface

### 5. Bulk Operations

- **Component**: `BulkUserOperations.tsx`
- **Features**:
  - Bulk role assignments
  - Mass status updates
  - Bulk notifications
  - Import/Export functionality
  - Operation history tracking

### 6. Audit Logging

- **Component**: `UserAuditLog.tsx`
- **Features**:
  - Comprehensive audit trail
  - Action filtering and search
  - Detailed change tracking
  - CSV export capabilities
  - Severity level indicators

### 7. User Analytics

- **Component**: `UserAnalytics.tsx`
- **Features**:
  - User metrics dashboard
  - Role and status distributions
  - Registration trends
  - User engagement analytics
  - Export functionality

### 8. Activity Monitoring

- **Component**: `UserActivityMonitor.tsx`
- **Features**:
  - Real-time user activity tracking
  - Active user sessions
  - Recent activity feed
  - Device and location tracking
  - Session management

### 9. User Import Wizard

- **Component**: `UserImportWizard.tsx`
- **Features**:
  - Guided CSV import process
  - Field mapping interface
  - Data validation and error reporting
  - Import preview and confirmation
  - Template download

## Architecture

### Component Structure

```
UserManagement/
├── UserManagementDashboard.tsx    # Main dashboard container
├── UserProfile.tsx                # Individual user profile management
├── UsersList.tsx                  # User listing and basic operations
├── RoleManagement.tsx             # Role creation and management
├── PermissionMatrix.tsx           # Permission assignment interface
├── BulkUserOperations.tsx         # Bulk operations interface
├── UserAuditLog.tsx              # Audit logging and history
├── UserAnalytics.tsx             # Analytics and reporting
├── UserActivityMonitor.tsx       # Real-time activity monitoring
└── UserImportWizard.tsx          # User import workflow
```

### Hooks Structure

```
hooks/
├── useUserManagement.ts          # Main user management operations
├── useUserProfile.ts             # Individual user profile data
└── useUsersList.ts               # User listing and filtering
```

### Data Models

#### User Interface

```typescript
interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'loan_officer' | 'client' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  location?: string;
  avatar?: string;
}
```

#### Role Interface

```typescript
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}
```

#### Permission Interface

```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

## Navigation

The User Management system is accessible through the Admin Dashboard sidebar:

- **Route**: `/admin/users`
- **Navigation**: Admin Dashboard → User Management
- **Tabs**: 8 main tabs for different management functions

### Tab Structure

1. **All Users** - User listing and basic management
2. **Roles** - Role creation and management
3. **Permissions** - Permission matrix and assignment
4. **Bulk Operations** - Mass user operations
5. **Audit Log** - Activity and change tracking
6. **Analytics** - User metrics and reporting
7. **Activity Monitor** - Real-time user monitoring
8. **Import Users** - CSV import wizard

## Security Features

### Role-Based Access Control (RBAC)

- Granular permission system
- Role hierarchy support
- System role protection
- Permission inheritance

### Audit Trail

- Complete action logging
- Change tracking with before/after states
- User attribution for all changes
- Exportable audit reports

### Data Protection

- Row-Level Security (RLS) enforcement
- Secure API endpoints
- Input validation and sanitization
- Protected sensitive operations

## Integration Points

### Supabase Backend

- User authentication and session management
- Database operations with RLS policies
- Real-time subscriptions for activity monitoring
- File storage for user avatars and documents

### Frontend Components

- shadcn/ui component library
- Lucide React icons
- Tailwind CSS styling
- React Hook Form for form management

## Development Notes

### Mock Data

Currently using mock data for development and testing:

- Sample users with various roles and statuses
- Mock audit log entries
- Simulated analytics data
- Test import/export functionality

### TODO: Backend Integration

- Replace mock data with Supabase API calls
- Implement real-time subscriptions
- Add file upload for user imports
- Connect to actual user database tables

### Performance Considerations

- Pagination for large user lists
- Lazy loading for detailed views
- Optimistic updates for better UX
- Debounced search and filtering

## Usage Examples

### Creating a New User

1. Navigate to User Management → All Users
2. Click "Add User" button
3. Fill in user details form
4. Assign appropriate role
5. Set initial status
6. Save and confirm

### Bulk Role Assignment

1. Go to Bulk Operations tab
2. Select multiple users from the list
3. Choose "Change Role" action
4. Select new role from dropdown
5. Add optional reason/notes
6. Execute bulk operation

### Viewing Audit Trail

1. Access Audit Log tab
2. Use filters to narrow down entries
3. Click on entry for detailed view
4. Export filtered results if needed

### Importing Users

1. Navigate to Import Users tab
2. Download CSV template
3. Upload populated CSV file
4. Map fields if necessary
5. Review validation results
6. Confirm and execute import

## Troubleshooting

### Common Issues

1. **Import Validation Errors**: Check CSV format and required fields
2. **Permission Denied**: Verify user has appropriate admin permissions
3. **Search Not Working**: Clear filters and try again
4. **Bulk Operations Failing**: Check user selection and operation parameters

### Debug Information

- All components include comprehensive error handling
- Console logging for development debugging
- Loading states for better user feedback
- Error boundaries for graceful failure handling

## Future Enhancements

### Planned Features

- Advanced user search with filters
- Custom permission templates
- Delegation capabilities for distributed administration
- Enhanced reporting and analytics
- Integration with external identity providers
- Mobile-responsive design improvements

### Performance Optimizations

- Virtual scrolling for large user lists
- Advanced caching strategies
- Background sync for offline capabilities
- Progressive loading for better perceived performance

---

This documentation provides a comprehensive overview of the User Management System. For technical implementation details, refer to the individual component files and their inline documentation.
