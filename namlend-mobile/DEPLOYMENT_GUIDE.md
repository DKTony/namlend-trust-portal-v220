# NamLend Trust Platform - Deployment Guide

**Version:** 1.0.0  
**Date:** October 19, 2025  
**Status:** Web Deployed ✅ | Mobile Ready for Build ⏳

---

## Executive Summary

This document provides a comprehensive deployment guide for the NamLend Trust Platform, covering both web (Netlify) and mobile (Expo EAS) deployment pipelines. The web application is fully deployed and operational. Mobile deployment infrastructure is configured and ready for builds, pending Apple Developer Program enrollment for iOS distribution.

### Deployment Status Overview

| Component | Platform | Status | URL/Identifier |
|-----------|----------|--------|----------------|
| **Web Application** | Netlify | ✅ Deployed | https://namlend-trust-portal-v220.netlify.app |
| **GitHub Repository** | GitHub | ✅ Live | https://github.com/DKTony/namlend-trust-portal-v220 |
| **Mobile (Android)** | Expo EAS | ⏳ Ready | Build pending user approval |
| **Mobile (iOS)** | Expo EAS | ⏳ Blocked | Requires Apple Developer enrollment |
| **Database** | Supabase | ✅ Live | Project: puahejtaskncpazjyxqp |

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Checklist](#deployment-checklist)
3. [Web Deployment (Netlify)](#web-deployment-netlify)
4. [Mobile Deployment (Expo EAS)](#mobile-deployment-expo-eas)
5. [Environment Configuration](#environment-configuration)
6. [Security Hardening](#security-hardening)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## Architecture Overview

### Technology Stack

**Web Application:**
- **Framework:** React 18.3.1 + TypeScript
- **Build Tool:** Vite 5.4.1
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack React Query v5.56.2
- **Routing:** React Router DOM v6.26.2
- **Hosting:** Netlify

**Mobile Application:**
- **Framework:** Expo SDK 54.0.13
- **Runtime:** React Native 0.81.4
- **Navigation:** React Navigation v7
- **State Management:** Zustand v5.0.8
- **Build Service:** Expo Application Services (EAS)

**Backend Services:**
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│         DKTony/namlend-trust-portal-v220 (main)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─────────────────┬──────────────────────────┐
                 │                 │                          │
                 ▼                 ▼                          ▼
         ┌───────────────┐  ┌──────────────┐      ┌─────────────────┐
         │   Netlify     │  │  Expo EAS    │      │   Supabase      │
         │   (Web)       │  │  (Mobile)    │      │   (Backend)     │
         │               │  │              │      │                 │
         │ Auto-deploy   │  │ Manual build │      │ Live Database   │
         │ on push       │  │ via CLI      │      │ + Auth + APIs   │
         └───────────────┘  └──────────────┘      └─────────────────┘
                 │                 │                          │
                 │                 │                          │
                 └─────────────────┴──────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   End Users     │
                          │  (NAD Market)   │
                          └─────────────────┘
```

---

## Deployment Checklist

### ✅ Completed Tasks

- [x] **Repository Setup**
  - [x] Created GitHub repository: `DKTony/namlend-trust-portal-v220`
  - [x] Pushed all code to `main` branch
  - [x] Configured `.gitignore` for sensitive files

- [x] **Web Deployment (Netlify)**
  - [x] Linked Netlify site to GitHub repository
  - [x] Configured build settings (`npm run build` → `dist`)
  - [x] Set production environment variables
  - [x] Hardened security flags (debug tools disabled)
  - [x] Verified SPA routing with redirects
  - [x] Confirmed auto-deploy on push to `main`

- [x] **Mobile Configuration (Expo EAS)**
  - [x] Installed EAS CLI globally
  - [x] Authenticated with Expo account (`anthnydklrk`)
  - [x] Created `eas.json` with build profiles
  - [x] Updated `app.json` with EAS project ID
  - [x] Fixed slug mismatch (`namlend-trust`)
  - [x] Set environment variables in Expo dashboard

- [x] **Environment Variables**
  - [x] Web: Configured all `VITE_*` variables in Netlify
  - [x] Mobile: Configured all `EXPO_PUBLIC_*` variables in Expo
  - [x] Verified Supabase connection strings

- [x] **Security Hardening**
  - [x] Disabled debug tools in production (`VITE_DEBUG_TOOLS=false`)
  - [x] Disabled dev scripts in production (`VITE_RUN_DEV_SCRIPTS=false`)
  - [x] Disabled local admin access (`VITE_ALLOW_LOCAL_ADMIN=false`)
  - [x] Verified no service-role keys in frontend code

### ⏳ Pending Tasks

- [ ] **iOS Deployment**
  - [ ] Enroll in Apple Developer Program ($99/year)
  - [ ] Wait for enrollment approval (24-48 hours)
  - [ ] Configure iOS credentials via EAS
  - [ ] Build production iOS app
  - [ ] Submit to App Store via EAS

- [ ] **Android Deployment**
  - [ ] Configure Android credentials (or use EAS managed)
  - [ ] Build production Android app
  - [ ] Create Google Play Store listing
  - [ ] Submit to Google Play Store

- [ ] **CI/CD Automation (Optional)**
  - [ ] Create GitHub Actions workflow for web deployment
  - [ ] Create GitHub Actions workflow for mobile builds
  - [ ] Set up automated testing pipeline

- [ ] **Monitoring & Analytics**
  - [ ] Configure error tracking (Sentry/LogRocket)
  - [ ] Set up analytics (Google Analytics/Mixpanel)
  - [ ] Configure performance monitoring

---

## Web Deployment (Netlify)

### Configuration Details

**Site Information:**
- **Site ID:** `9e80754a-79c0-4cb6-8530-299010039f79`
- **Site Name:** `namlend-trust-portal-v220`
- **Primary URL:** https://namlend-trust-portal-v220.netlify.app
- **Repository:** https://github.com/DKTony/namlend-trust-portal-v220
- **Branch:** `main`

**Build Settings:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA fallback for React Router
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

**Environment Variables (Production):**
```bash
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_DEBUG_TOOLS=false
VITE_RUN_DEV_SCRIPTS=false
VITE_ALLOW_LOCAL_ADMIN=false
```

### Deployment Process

**Automatic Deployment:**
1. Push code to `main` branch
2. Netlify detects changes via webhook
3. Netlify runs `npm run build`
4. Build artifacts published to CDN
5. Site live at primary URL

**Manual Deployment (if needed):**
```bash
# From project root
npm run build
npx netlify deploy --prod --dir=dist
```

### Verification Steps

1. **Build Status:** Check Netlify dashboard for successful build
2. **Environment Variables:** Verify all vars are set correctly
3. **Routing:** Test deep links and SPA navigation
4. **API Connectivity:** Verify Supabase connection
5. **Security Headers:** Check CSP and security headers

---

## Mobile Deployment (Expo EAS)

### Project Configuration

**EAS Project:**
- **Project ID:** `dd2be84c-b993-419c-9177-6c69da3334d2`
- **Full Name:** `@anthnydklrk/namlend-trust`
- **Slug:** `namlend-trust`
- **Version:** `2.6.0`

**Bundle Identifiers:**
- **iOS:** `com.namlend.mobile`
- **Android:** `com.namlend.mobile`

### Build Profiles (`eas.json`)

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Environment Variables (Expo Dashboard)

All variables configured in Expo project settings:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES=15
EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS=5
EXPO_PUBLIC_MAX_APR=32
EXPO_PUBLIC_CURRENCY=NAD
```

### iOS Deployment

**Prerequisites:**
1. **Apple Developer Program Membership** ($99/year)
   - Enroll at: https://developer.apple.com/programs/enroll/
   - Account: `anthnydklrk@gmail.com`
   - Approval time: 24-48 hours

2. **App Store Connect Access**
   - Create App ID: `com.namlend.mobile`
   - Configure app metadata
   - Upload screenshots and descriptions

**Build Commands:**
```bash
cd namlend-mobile

# Configure iOS credentials (after Apple enrollment)
eas credentials -p ios

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Current Status:** ⏳ **Blocked** - Waiting for Apple Developer Program enrollment

### Android Deployment

**Prerequisites:**
1. **Google Play Console Account** (One-time $25 fee)
   - Create at: https://play.google.com/console
   - Account: `anthnydklrk@gmail.com`

2. **App Listing**
   - Create app in Play Console
   - Configure store listing
   - Upload screenshots and descriptions

**Build Commands:**
```bash
cd namlend-mobile

# Configure Android credentials (EAS managed keystore recommended)
eas credentials -p android

# Build for production
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

**Current Status:** ✅ **Ready** - No blockers, can build immediately

### Development Builds

For testing on physical devices:

```bash
# Build development client
eas build --platform android --profile development

# Install on device and run
npx expo start --dev-client
```

---

## Environment Configuration

### Web Environment Variables (Vite)

**Required Variables:**
| Variable | Description | Production Value |
|----------|-------------|------------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://puahejtaskncpazjyxqp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_DEBUG_TOOLS` | Enable debug utilities | `false` |
| `VITE_RUN_DEV_SCRIPTS` | Auto-run dev scripts | `false` |
| `VITE_ALLOW_LOCAL_ADMIN` | Enable admin client | `false` |

**Optional Variables:**
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_E2E` | E2E testing mode | `false` |

### Mobile Environment Variables (Expo)

**Required Variables:**
| Variable | Description | Production Value |
|----------|-------------|------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://puahejtaskncpazjyxqp.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `EXPO_PUBLIC_ENV` | Environment name | `production` |
| `EXPO_PUBLIC_MAX_APR` | Namibian APR cap | `32` |
| `EXPO_PUBLIC_CURRENCY` | Currency code | `NAD` |

**Feature Flags:**
| Variable | Description | Production Value |
|----------|-------------|------------------|
| `EXPO_PUBLIC_ENABLE_BIOMETRIC` | Biometric auth | `true` |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | Push notifications | `true` |
| `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` | Offline support | `true` |

**Security Settings:**
| Variable | Description | Production Value |
|----------|-------------|------------------|
| `EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES` | Session timeout | `15` |
| `EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS` | Max login attempts | `5` |
| `EXPO_PUBLIC_API_TIMEOUT` | API timeout (ms) | `30000` |

### Supabase Configuration

**Project Details:**
- **Project ID:** `puahejtaskncpazjyxqp`
- **Region:** EU-North-1
- **URL:** `https://puahejtaskncpazjyxqp.supabase.co`

**API Keys:**
- **Anon/Public Key:** Used in frontend (safe to expose)
- **Service Role Key:** ⚠️ **NEVER expose in frontend** - server-side only

**Database:**
- **PostgreSQL:** Version 15+
- **Row-Level Security (RLS):** Enabled on all tables
- **Migrations:** Managed via `supabase/migrations/`

---

## Security Hardening

### Production Security Checklist

- [x] **Frontend Security**
  - [x] No service-role keys in client code
  - [x] Debug tools disabled (`VITE_DEBUG_TOOLS=false`)
  - [x] Dev scripts disabled (`VITE_RUN_DEV_SCRIPTS=false`)
  - [x] Admin client disabled (`VITE_ALLOW_LOCAL_ADMIN=false`)
  - [x] Environment variables properly scoped

- [x] **API Security**
  - [x] Supabase RLS policies enabled
  - [x] Authentication required for sensitive operations
  - [x] Role-based access control (RBAC) implemented
  - [x] API rate limiting via Supabase

- [x] **Network Security**
  - [x] HTTPS enforced on all endpoints
  - [x] CSP headers configured in Netlify
  - [x] CORS properly configured
  - [x] Security headers set (X-Frame-Options, etc.)

- [ ] **Mobile Security**
  - [ ] Certificate pinning (recommended for production)
  - [ ] Secure storage for sensitive data
  - [ ] Biometric authentication enabled
  - [ ] Session timeout configured

### Security Best Practices

**Environment Variables:**
- Never commit `.env` files to Git
- Use different keys for dev/staging/production
- Rotate keys periodically
- Use Netlify/Expo secret management

**Authentication:**
- Enforce strong password policies
- Implement MFA for admin accounts
- Session timeout: 15 minutes
- Max login attempts: 5

**Data Protection:**
- All PII encrypted at rest
- Sensitive data masked in logs
- Audit trail for all admin actions
- Compliance with Namibian data protection laws

---

## CI/CD Pipeline

### Current Setup

**Web (Netlify):**
- ✅ Automatic deployment on push to `main`
- ✅ Build previews for pull requests
- ✅ Rollback capability via Netlify dashboard

**Mobile (Expo EAS):**
- ⏳ Manual builds via CLI
- ⏳ Optional: GitHub Actions for automated builds

### Optional: GitHub Actions Workflows

**Web Deployment (`.github/workflows/deploy-web.yml`):**
```yaml
name: Deploy Web to Netlify

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Mobile Build (`.github/workflows/mobile-build.yml`):**
```yaml
name: EAS Build

on:
  push:
    tags:
      - 'mobile-v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g eas-cli
      - run: cd namlend-mobile && eas build --platform all --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**Required GitHub Secrets:**
- `NETLIFY_AUTH_TOKEN`: Netlify personal access token
- `NETLIFY_SITE_ID`: `9e80754a-79c0-4cb6-8530-299010039f79`
- `EXPO_TOKEN`: Expo access token (from `eas whoami`)

---

## Troubleshooting

### Common Issues

#### Web Deployment

**Issue: Build fails on Netlify**
```bash
# Solution: Check build logs in Netlify dashboard
# Verify package.json scripts
# Ensure all dependencies are in package.json (not just devDependencies)
```

**Issue: Environment variables not loading**
```bash
# Solution: Verify variables are set in Netlify UI
# Check variable names match exactly (case-sensitive)
# Redeploy after adding new variables
```

**Issue: 404 on page refresh**
```bash
# Solution: Verify netlify.toml has SPA redirect
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Mobile Deployment

**Issue: EAS build fails**
```bash
# Check eas.json is valid JSON
# Verify app.json slug matches EAS project
# Check all required assets exist (icon, splash, etc.)
# Review build logs: eas build:list
```

**Issue: iOS credentials error**
```bash
# Ensure Apple Developer Program is active
# Run: eas credentials -p ios
# Follow prompts to regenerate credentials
```

**Issue: Android keystore issues**
```bash
# Use EAS managed keystore (recommended)
# Or upload existing keystore via: eas credentials -p android
```

#### Database Connection

**Issue: Supabase connection fails**
```bash
# Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
# Check network connectivity
# Verify RLS policies allow access
# Check Supabase project status
```

### Debug Commands

**Web:**
```bash
# Local build test
npm run build
npm run preview

# Check environment variables
npm run dev
# Open browser console, check import.meta.env
```

**Mobile:**
```bash
# Check EAS project
eas project:info

# List builds
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Check credentials
eas credentials -p ios
eas credentials -p android
```

---

## Next Steps

### Immediate Actions (Priority 1)

1. **Apple Developer Enrollment**
   - [ ] Complete enrollment at https://developer.apple.com/programs/enroll/
   - [ ] Wait for approval (24-48 hours)
   - [ ] Configure iOS credentials in EAS

2. **Android Build**
   - [ ] Run: `eas build --platform android --profile production`
   - [ ] Test APK on physical device
   - [ ] Create Google Play Store listing

### Short-term (1-2 weeks)

3. **Store Submissions**
   - [ ] Submit Android app to Google Play
   - [ ] Submit iOS app to App Store (after enrollment)
   - [ ] Configure TestFlight for iOS beta testing

4. **Monitoring Setup**
   - [ ] Integrate error tracking (Sentry)
   - [ ] Set up analytics (Google Analytics)
   - [ ] Configure performance monitoring

### Medium-term (1 month)

5. **CI/CD Automation**
   - [ ] Implement GitHub Actions workflows
   - [ ] Set up automated testing
   - [ ] Configure staging environments

6. **Documentation**
   - [ ] Create user guides
   - [ ] Document API endpoints
   - [ ] Write troubleshooting guides

### Long-term (Ongoing)

7. **Optimization**
   - [ ] Performance monitoring and optimization
   - [ ] Security audits
   - [ ] Feature rollout via OTA updates (Expo)
   - [ ] A/B testing infrastructure

---

## Appendix

### Useful Commands Reference

**Web (Netlify):**
```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Netlify
npx netlify deploy --prod --dir=dist

# Check Netlify status
npx netlify status
```

**Mobile (Expo EAS):**
```bash
# Check authentication
eas whoami

# Project info
eas project:info

# Build commands
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Manage credentials
eas credentials -p ios
eas credentials -p android

# OTA updates
eas update --branch production --message "Bug fixes"

# List builds
eas build:list

# View build details
eas build:view [BUILD_ID]
```

**Git:**
```bash
# Push to trigger Netlify deploy
git add .
git commit -m "feat: new feature"
git push origin main

# Create release tag for mobile
git tag -a mobile-v2.6.0 -m "Release v2.6.0"
git push origin mobile-v2.6.0
```

### Contact Information

**Technical Support:**
- **Developer:** Anthony de Klerk
- **Email:** anthnydklrk@gmail.com
- **GitHub:** DKTony

**Platform Access:**
- **Netlify:** https://app.netlify.com/projects/namlend-trust-portal-v220
- **Expo:** https://expo.dev/@anthnydklrk/namlend-trust
- **Supabase:** https://supabase.com/dashboard/project/puahejtaskncpazjyxqp

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-19 | Cascade AI | Initial deployment guide creation |

---

**End of Deployment Guide**
