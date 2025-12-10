# NamLend Trust - Setup Guide

## 🚀 Quick Setup

### 1. Environment Configuration

Copy the example environment file and configure your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project details:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_RUN_DEV_SCRIPTS=true
VITE_DEBUG_TOOLS=true
```

### 2. Getting Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → API**
4. Copy the following keys:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `VITE_SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🔧 Development Setup

### Admin User Creation

To create an admin user for testing:

1. Sign up normally through the application
2. In Supabase Dashboard → Authentication → Users
3. Find your user and note the User ID
4. In Supabase Dashboard → SQL Editor, run:

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id-here', 'admin');
```

### Development Utilities

With `VITE_RUN_DEV_SCRIPTS=true`, these utilities are available in browser console:

- `window.directPasswordReset()` - Test password reset functionality
- `window.debugServiceKey()` - Debug service role key configuration
- `window.testSupabaseAccess()` - Test database access
- `window.createSampleLoans()` - Generate sample loan data

## Security Configuration

### Service Role Key Setup

The service role key is required for admin operations like password resets. Ensure:

1. Key is correctly copied from Supabase Dashboard
2. Environment variable uses `VITE_` prefix
3. Key is not exposed in client-side production code

### Testing Admin Access

1. Create admin user (see above)
2. Login with admin credentials
3. Verify access to `/admin` dashboard
4. Test loan approval functionality

### Supabase Storage Setup (v2.2.0)

For KYC document verification, create a private storage bucket:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `kyc-documents`
3. Set bucket to **Private** (not public)
4. Configure RLS policies for secure access:

```sql
-- Allow users to upload their own documents
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own documents
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'kyc-documents' AND 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

## Troubleshooting

### Common Issues

**"Invalid API key" errors:**

- Verify service role key is current in Supabase Dashboard
- Check environment variable naming (`VITE_` prefix required)
- Restart development server after changing `.env`

**Login not working:**

- Reset password via Supabase Dashboard → Authentication → Users
- Check email/password combination
- Verify user exists in database

**Admin dashboard access denied:**

- Ensure user has admin role in `user_roles` table
- Check RLS policies are properly configured
- Verify session is properly authenticated

### Manual Password Reset

If automated password reset fails:

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user by email or ID
3. Click on user → Reset Password
4. Set new password directly

## Database Schema

The application uses the following core tables:

- `users` - Authentication and profile data
- `user_roles` - Role assignments (client/admin)
- `profiles` - Extended user profile information (v2.2.0)
- `loans` - Loan applications and processing
- `loan_documents` - Document attachments
- `loan_approvals` - Approval workflow
- `document_verification_requirements` - KYC document tracking (v2.2.0)
- `approval_requests` - Centralized approval workflow
- `approval_notifications` - Admin notification system

### New Tables (v2.2.0)

#### document_verification_requirements

- Tracks KYC document submission and verification status
- Document types: `id_document`, `bank_statement_1-3`, `payslip`, etc.
- Status lifecycle: Required → Under Review → Verified/Rejected
- Links to private `kyc-documents` Supabase Storage bucket

#### Enhanced profiles table

- Extended with address, employment, and banking information
- Profile completion percentage calculation via RPC functions
- Loan eligibility gating based on profile completeness

All tables have Row-Level Security (RLS) enabled for data protection.

## Production Deployment

### Production Environment Setup

Create a `.env` file in the root directory with v2.0.0 configuration:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
VITE_APP_NAME=NamLend Trust
VITE_APP_VERSION=2.0.0
VITE_APP_ENVIRONMENT=production

# Feature Flags (v2.0.0 Security)
VITE_DEBUG_TOOLS=false
VITE_RUN_DEV_SCRIPTS=false
VITE_ALLOW_LOCAL_ADMIN=false

# Monitoring Configuration (v2.0.0 Enhancement)
VITE_ERROR_REPORTING=true
VITE_PERFORMANCE_MONITORING=true
```

### Build and Deploy

```bash
npm run build
# Deploy dist/ folder to your hosting platform
```

The project includes `netlify.toml` for Netlify deployment with proper redirects and security headers.
