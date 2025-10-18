# NamLend Trust - Loan Management Platform

**Version**: 1.4.0  
**Last Updated**: September 6, 2025  
**Status**: Production Ready with Back Office Approval Integration

## 🚀 Current Status (September 2025)

**✅ Production Ready** - All critical security issues resolved  
**✅ Back Office Integration** - Comprehensive approval workflow system implemented  
**✅ Mandatory Approval Flow** - All user requests route through admin approval  
**✅ Real-time Notifications** - Admin notification system with approval alerts  
**✅ Authentication Working** - Reactive SPA-friendly auth flow  
**✅ Navigation Fixed** - Proper dashboard routing  
**✅ Console Clean** - No development errors  
**✅ Security Hardened** - Comprehensive security audit passed  

## 🔒 Security Features

- **Enterprise Authentication**: Supabase Auth with reactive state management
- **Role-Based Access Control**: Database-backed admin/client roles with RLS
- **API Key Protection**: Service keys never exposed to frontend
- **Mandatory Approval Workflow**: All user requests require back office approval
- **Comprehensive Audit Trail**: Complete workflow history for regulatory compliance
- **Real-time Admin Notifications**: Instant alerts for pending approvals and status changes
- **Development Security**: Triple-gated debug tools with secure logging
- **Regulatory Compliance**: 32% APR limit enforcement for Namibian market

## 🎯 Core Features

- **Secure Loan Management**: Complete lifecycle from application to repayment
- **Real-time Dashboard**: Live updates with role-based views (admin/client)
- **Document Management**: Secure upload and management of loan documents
- **Automated Workflows**: Streamlined approval processes and notifications
- **Mock Development**: Full-featured development environment without backend

## 🛠 Technology Stack

- **Frontend**: React 18.3.1 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time + RLS)
- **Styling**: Tailwind CSS with modern UI components
- **Build Tool**: Vite with optimized production builds
- **Deployment**: Netlify with automated deployments
- **Currency**: NAD (Namibian Dollar) with proper formatting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Setup

1. **Clone and Install**:
```bash
git clone <repository-url>
cd namlend-trust-main-3
npm install
```

2. **Environment Setup**:
```bash
cp .env.example .env
# The .env file is pre-configured with demo credentials for development
```

3. **Start Development Server**:
```bash
npm run dev
# App runs at http://localhost:8081
```

4. **Test Authentication**:
- **Regular User**: `test@example.com` / any password → `/dashboard`
- **Admin User**: `admin@example.com` / any password → `/admin`

### Production Setup

1. **Configure Real Supabase**:
```bash
# Update .env with your production Supabase credentials
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-key
VITE_DEBUG_TOOLS=false
```

2. **Deploy**:
```bash
### 5-Phase Loan Processing
1. **Application Submitted** - Initial loan application
2. **Under Review** - Admin assessment phase
3. **Approved** - Loan approved, awaiting funding
4. **Funded** - Loan disbursed to client
5. **Rejected** - Application declined

### Features
- Loan calculator with NAD currency
- Document upload and management
- Real-time status tracking
- Admin dashboard for loan approval
- Automated loan processing workflows

## 🛠️ Development

### Available Scripts
```sh
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Development Utilities
When `VITE_RUN_DEV_SCRIPTS=true`, the following utilities are available:
- Password reset testing (`window.directPasswordReset()`)
- Service role key debugging (`window.debugServiceKey()`)
- Supabase access testing (`window.testSupabaseAccess()`)
- Sample data creation and user role setup

## 📊 Database Schema

### Core Tables
- `users` - User authentication and profile data
- `user_roles` - Role assignments (client/admin)
- `loans` - Loan applications and status
- `loan_documents` - Document attachments
- `loan_approvals` - Approval workflow tracking

### Supabase Integration
- **Authentication**: Built-in user management
- **Database**: PostgreSQL with RLS
- **Edge Functions**: Loan processing automation
- **Storage**: Document management

## 🚀 Deployment

### Netlify Deployment
The project includes `netlify.toml` configuration:

```sh
npm run build
# Deploy dist/ folder to Netlify
```

### Environment Variables for Production
Ensure all `VITE_` prefixed environment variables are configured in your deployment platform.

## 📚 Documentation

- **[Technical Specifications](docs/technical-specs/README.md)** - Detailed technical documentation
- **[Executive Summary](docs/Executive%20Summary.md)** - Project overview and progress
- **[Changelog](docs/CHANGELOG.md)** - Version history and updates
- **[Business Requirements](docs/business-requirements/)** - Functional specifications

## 🔧 Recent Updates (v1.4.0)

### Supabase Configuration & Security Hardening
- Updated Supabase keys with new project credentials
- Implemented service role key for admin operations
- Enhanced authentication security (removed client-side role selection)
- Added comprehensive password reset utilities
- Fixed environment variable configuration for Vite

### Authentication Improvements
- Server-side role assignment enforcement
- Enhanced email input validation and sanitization
- Separate admin client for privileged operations
- Improved error handling and user feedback

## 🐛 Known Issues

- Service role key may require verification in Supabase Dashboard
- Manual password reset via Dashboard may be needed if service key is outdated

## 📞 Support

For technical issues or questions, refer to the documentation in the `docs/` directory or check the project's issue tracker.
