# Download Playwright Report - Instructions

## Quick Steps

### 1. Go to GitHub Actions
**URL:** https://github.com/DKTony/namlend-trust-portal-v220/actions/runs/19212676816

### 2. Scroll Down to "Artifacts"
Look for the section at the bottom of the page labeled "Artifacts"

### 3. Download "playwright-report"
- Click on `playwright-report` (3.4 MB)
- It will download as `playwright-report.zip`

### 4. Extract and Open
```bash
# Extract the zip file
unzip ~/Downloads/playwright-report.zip -d ~/Downloads/playwright-report

# Open the report in your browser
open ~/Downloads/playwright-report/index.html
```

Or just:
- Double-click `playwright-report.zip` to extract
- Open the extracted folder
- Double-click `index.html`

---

## What to Look For

### 1. Failed Tests
- Red ❌ marks indicate failures
- Click on each failed test to see details

### 2. Error Messages
Look for patterns like:
- "Cannot find element" → UI issue
- "Authentication failed" → User/role issue
- "Expected X but got Y" → Data issue
- "Timeout" → Performance/async issue

### 3. Screenshots
- Each failed test has a screenshot
- Shows exact state when test failed
- Very helpful for UI tests

### 4. Test Traces
- Click "View trace" for detailed timeline
- Shows every action the test took
- Network requests, console logs, etc.

---

## Common Failure Patterns

### Pattern 1: "No loans found"
**Symptom:** Tests fail looking for approved loans  
**Cause:** No test data in database  
**Fix:** Need to create test loans

### Pattern 2: "Permission denied"
**Symptom:** RLS policy violations  
**Cause:** User roles incorrect (FIXED NOW ✅)  
**Fix:** Already fixed - roles cleaned up

### Pattern 3: "Element not found"
**Symptom:** UI tests can't find buttons/forms  
**Cause:** Page didn't load or wrong state  
**Fix:** Check if dev server started correctly

### Pattern 4: "Authentication failed"
**Symptom:** Can't sign in test users  
**Cause:** User doesn't exist or wrong password  
**Fix:** Already fixed - all users created ✅

---

## Report Analysis Checklist

- [ ] Download and extract report
- [ ] Open index.html in browser
- [ ] Count failed vs passed tests
- [ ] Group failures by type (API, UI, RLS)
- [ ] Note common error messages
- [ ] Check if screenshots show missing data
- [ ] Identify which test suite has most failures

---

## Next Steps After Review

Based on what you find:

### If Most Failures Are "No loans found"
→ Need to create test data (loans, applications)

### If Most Failures Are "Permission denied"  
→ Check RLS policies (though roles are now fixed)

### If Most Failures Are "Element not found"
→ UI/timing issues - may need to adjust waits

### If Tests Pass Locally But Fail in CI
→ Environment differences (secrets, timing, etc.)

---

## Alternative: View in GitHub UI

If you don't want to download:

1. Go to the workflow run
2. Click on the "e2e" job
3. Expand "Run Playwright tests" step
4. Read the console output (less detailed but faster)

---

**Current Status:**
- ✅ Roles fixed (all users have single correct role)
- ✅ All 4 test users exist with profiles
- ⏳ Waiting for Playwright report analysis
- ⏳ Likely need test data (loans/applications)
