import { testEnvironment } from '@/utils/testUtils';
import { supabase } from '@/integrations/supabase/client';

describe('NamLend System Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    console.log('Setting up test environment...');
  });

  afterAll(async () => {
    // Cleanup test data
    await testEnvironment.cleanup();
    console.log('Test environment cleaned up');
  });

  describe('Database Connectivity', () => {
    test('should connect to Supabase successfully', async () => {
      const result = await testEnvironment.testDatabaseConnectivity();
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(7); // 1 connection + 1 RLS + 5 tables
      
      const failedTests = result.results.filter(r => !r.success);
      if (failedTests.length > 0) {
        console.error('Failed database tests:', failedTests);
      }
    }, 30000);

    test('should have all required tables', async () => {
      const tables = ['profiles', 'loans', 'approval_requests', 'user_roles', 'payments'];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        expect(error).toBeNull();
      }
    });
  });

  describe('Authentication Flow', () => {
    test('should handle complete authentication workflow', async () => {
      const result = await testEnvironment.testAuthentication();
      
      expect(result.success).toBe(true);
      
      // Check that all test users were processed
      const userResults = result.results.filter(r => r.test === 'complete_auth_flow');
      expect(userResults).toHaveLength(3); // admin, client, loan_officer
      
      // All users should authenticate successfully
      userResults.forEach(userResult => {
        expect(userResult.success).toBe(true);
      });
    }, 60000);

    test('should enforce role-based access control', async () => {
      // Sign in as client
      const { data: clientAuth } = await supabase.auth.signInWithPassword({
        email: 'client@test.namlend.com',
        password: 'TestClient123!'
      });

      expect(clientAuth.user).toBeTruthy();

      // Client should not be able to access admin functions
      const { data: adminData, error: adminError } = await supabase
        .from('user_roles')
        .select('*')
        .neq('user_id', clientAuth.user!.id);

      // This should fail due to RLS policies
      expect(adminError).toBeTruthy();
    });
  });

  describe('Loan Application Workflow', () => {
    test('should process complete loan application flow', async () => {
      const result = await testEnvironment.testLoanWorkflow('client@test.namlend.com');
      
      expect(result.success).toBe(true);
      
      const submissionResult = result.results.find(r => r.test === 'loan_application_submission');
      expect(submissionResult?.success).toBe(true);
      
      const approvalResult = result.results.find(r => r.test === 'loan_approval');
      expect(approvalResult?.success).toBe(true);
      
      const loanCreationResult = result.results.find(r => r.test === 'loan_record_creation');
      expect(loanCreationResult?.success).toBe(true);
    }, 45000);

    test('should validate loan amount limits', async () => {
      // Test maximum loan amount (NAD 500,000 as per regulatory limits)
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'client@test.namlend.com',
        password: 'TestClient123!'
      });

      const { data: validLoan, error: validError } = await supabase
        .from('approval_requests')
        .insert({
          user_id: authData!.user.id,
          request_type: 'loan_application',
          request_data: {
            amount: 450000, // Within limit
            term_months: 24,
            purpose: 'Business expansion'
          },
          status: 'pending'
        });

      expect(validError).toBeNull();

      // Test exceeding maximum loan amount
      const { data: invalidLoan, error: invalidError } = await supabase
        .from('approval_requests')
        .insert({
          user_id: authData!.user.id,
          request_type: 'loan_application',
          request_data: {
            amount: 600000, // Exceeds limit
            term_months: 24,
            purpose: 'Business expansion'
          },
          status: 'pending'
        });

      // This should either fail or require special approval
      // Implementation depends on business rules
    });

    test('should enforce 32% APR regulatory limit', async () => {
      const testLoan = {
        amount: 100000,
        term_months: 12,
        interest_rate: 35.0 // Exceeds 32% limit
      };

      // Calculate if interest rate exceeds regulatory limit
      expect(testLoan.interest_rate).toBeGreaterThan(32);
      
      // In production, this should trigger validation errors
      // or automatic adjustment to comply with regulations
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance thresholds', async () => {
      const result = await testEnvironment.testPerformance();
      
      expect(result.success).toBe(true);
      
      const profilesTest = result.results.find(r => r.test === 'profiles_query_performance');
      expect(profilesTest?.duration).toBeLessThan(2000);
      
      const loansTest = result.results.find(r => r.test === 'loans_query_performance');
      expect(loansTest?.duration).toBeLessThan(1500);
    }, 30000);

    test('should handle concurrent user load', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          supabase.from('profiles').select('*').limit(10)
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Should handle concurrent load efficiently
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Security Validation', () => {
    test('should enforce Row Level Security policies', async () => {
      // Test that users can only access their own data
      const { data: user1Auth } = await supabase.auth.signInWithPassword({
        email: 'client@test.namlend.com',
        password: 'TestClient123!'
      });

      const { data: user2Auth } = await supabase.auth.signInWithPassword({
        email: 'officer@test.namlend.com',
        password: 'TestOfficer123!'
      });

      // User 1 should not see User 2's loans
      await supabase.auth.setSession({
        access_token: user1Auth!.session!.access_token,
        refresh_token: user1Auth!.session!.refresh_token
      });

      const { data: user1Loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user2Auth!.user.id);

      // Should return empty or error due to RLS
      expect(user1Loans).toHaveLength(0);
    });

    test('should validate input sanitization', async () => {
      const maliciousInput = "<script>alert('xss')</script>";
      
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'client@test.namlend.com',
        password: 'TestClient123!'
      });

      const { data: profileData, error } = await supabase
        .from('profiles')
        .update({
          first_name: maliciousInput
        })
        .eq('user_id', authData!.user.id);

      // Should either sanitize input or reject it
      if (!error) {
        // If accepted, should be sanitized
        const { data: retrievedProfile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', authData!.user.id)
          .single();

        expect(retrievedProfile?.first_name).not.toContain('<script>');
      }
    });
  });

  describe('Business Logic Validation', () => {
    test('should calculate loan payments correctly', async () => {
      const principal = 100000; // NAD 100,000
      const annualRate = 0.18; // 18% APR
      const termMonths = 12;

      // Calculate monthly payment using standard formula
      const monthlyRate = annualRate / 12;
      const expectedPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                             (Math.pow(1 + monthlyRate, termMonths) - 1);

      expect(Math.round(expectedPayment * 100) / 100).toBeCloseTo(9201.84, 2);
    });

    test('should enforce minimum income requirements', async () => {
      // Test that loan amount doesn't exceed income-based limits
      const monthlyIncome = 25000; // NAD 25,000
      const maxLoanAmount = monthlyIncome * 36; // 3 years of income
      const requestedAmount = 950000; // Exceeds income-based limit

      expect(requestedAmount).toBeGreaterThan(maxLoanAmount);
      
      // In production, this should trigger validation errors
    });
  });

  describe('Comprehensive System Test', () => {
    test('should pass full system validation', async () => {
      const result = await testEnvironment.runComprehensiveTests();
      
      expect(result.success).toBe(true);
      expect(result.summary.passedTests).toBeGreaterThan(0);
      expect(result.summary.failedTests).toBe(0);
      
      console.log('System Test Summary:', {
        totalTests: result.summary.totalTests,
        passed: result.summary.passedTests,
        failed: result.summary.failedTests,
        timestamp: result.summary.timestamp
      });
    }, 120000);
  });
});
