---
description: Deploy web platform to Netlify
---

# Deploy Web Platform to Netlify

This workflow guides you through deploying the NamLend Trust web platform to Netlify.

## Prerequisites Check

1. Verify you're on the correct branch
```bash
git branch --show-current
```

2. Ensure all changes are committed
```bash
git status
```

3. Run build locally to catch errors early
```bash
npm run build
```

## Pre-Deployment Checks

4. Run TypeScript type checking
```bash
npm run type-check
```

5. Verify environment variables are set in Netlify dashboard
- Navigate to: https://app.netlify.com/sites/namlend-trust-portal-v220/settings/env
- Required variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

6. Check for any breaking database migrations
```bash
cd supabase
supabase db diff
```

## Deployment

// turbo
7. Push to main branch (triggers auto-deploy)
```bash
git push origin main
```

8. Monitor deployment in Netlify
- URL: https://app.netlify.com/sites/namlend-trust-portal-v220/deploys
- Wait for "Published" status

## Post-Deployment Verification

9. Verify deployment is live
```bash
curl -I https://namlend-trust-portal-v220.netlify.app
```

10. Test critical user flows:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Loan application flow works
- [ ] Payment processing works
- [ ] Admin dashboard accessible

11. Check browser console for errors
- Open: https://namlend-trust-portal-v220.netlify.app
- Open DevTools (F12)
- Look for console errors

12. Verify Supabase connection
- Check that data loads correctly
- Verify RLS policies are working
- Test authentication flow

## Rollback (if needed)

13. If deployment has issues, rollback in Netlify:
- Go to: https://app.netlify.com/sites/namlend-trust-portal-v220/deploys
- Find previous working deploy
- Click "Publish deploy"

## Troubleshooting

**Build fails:**
- Check build logs in Netlify
- Verify all dependencies are in package.json
- Check for TypeScript errors

**Environment variables missing:**
- Add them in Netlify dashboard
- Trigger new deploy

**Runtime errors:**
- Check browser console
- Verify Supabase connection
- Check RLS policies

## Success Criteria
✅ Build completes without errors
✅ Deployment shows "Published" status
✅ Site loads at production URL
✅ Login and critical flows work
✅ No console errors
✅ Database queries work correctly
