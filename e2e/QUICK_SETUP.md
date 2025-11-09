# Quick E2E Test Setup

## Step 2: Create Test Users in Supabase

### Option A: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/puahejtaskncpazjyxqp

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Script**
   - Open the file: `e2e/create-test-users.sql`
   - Copy all contents
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see messages like:
     ```
     ✓ Created client1@test.namlend.com
     ✓ Created client2@test.namlend.com
     ✓ Created admin@test.namlend.com
     ✓ Created loan_officer@test.namlend.com
     ```
   - A table showing all 4 users with their roles and profiles

### Option B: Using Supabase Dashboard UI

If the SQL script doesn't work, create users manually:

1. **Go to Authentication → Users**
2. **Click "Add user" → "Create new user"**
3. **Create each user:**

   **User 1:**
   - Email: `client1@test.namlend.com`
   - Password: `test123`
   - Auto Confirm User: ✓ (checked)
   
   **User 2:**
   - Email: `client2@test.namlend.com`
   - Password: `test123`
   - Auto Confirm User: ✓ (checked)
   
   **User 3:**
   - Email: `admin@test.namlend.com`
   - Password: `test123`
   - Auto Confirm User: ✓ (checked)
   
   **User 4:**
   - Email: `loan_officer@test.namlend.com`
   - Password: `test123`
   - Auto Confirm User: ✓ (checked)

4. **Add Roles (SQL Editor)**
   ```sql
   -- Add admin role
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'admin@test.namlend.com';

   -- Add loan_officer role
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'loan_officer'
   FROM auth.users
   WHERE email = 'loan_officer@test.namlend.com';

   -- Client roles should be added automatically by trigger
   ```

## Verification

Run this query in SQL Editor to verify all users are set up:

```sql
SELECT 
  u.email,
  ur.role,
  CASE WHEN p.user_id IS NOT NULL THEN '✓ Has Profile' ELSE '✗ Missing Profile' END as profile_status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email IN (
  'client1@test.namlend.com',
  'client2@test.namlend.com',
  'admin@test.namlend.com',
  'loan_officer@test.namlend.com'
)
ORDER BY u.email;
```

**Expected Output:**
| email | role | profile_status |
|-------|------|----------------|
| admin@test.namlend.com | admin | ✓ Has Profile |
| client1@test.namlend.com | client | ✓ Has Profile |
| client2@test.namlend.com | client | ✓ Has Profile |
| loan_officer@test.namlend.com | loan_officer | ✓ Has Profile |

## Step 3: Run E2E Tests

Once users are created, the E2E tests should pass:

### Locally
```bash
npm run test:e2e
```

### GitHub Actions
Push any commit to `main` branch and check the Actions tab.

## Troubleshooting

### Issue: "User already exists" error
- Users might have been partially created
- Run the verification query to check status
- Delete and recreate if needed

### Issue: "Missing role" error
- Run the role assignment SQL from Option B step 4

### Issue: "Missing profile" error
- Profiles should be created automatically by trigger
- If not, create manually:
  ```sql
  INSERT INTO profiles (user_id, first_name, last_name, phone_number)
  SELECT id, 'Test', 'User', '+264811234567'
  FROM auth.users
  WHERE email = 'client1@test.namlend.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.users.id);
  ```

## Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/puahejtaskncpazjyxqp
- **SQL Editor:** https://supabase.com/dashboard/project/puahejtaskncpazjyxqp/sql
- **Authentication:** https://supabase.com/dashboard/project/puahejtaskncpazjyxqp/auth/users
- **GitHub Actions:** https://github.com/DKTony/namlend-trust-portal-v220/actions

---

**Total Time:** ~5 minutes  
**Difficulty:** Easy  
**Prerequisites:** Supabase dashboard access
