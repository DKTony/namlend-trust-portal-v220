import { supabase } from '@/integrations/supabase/client';
import { errorLogger, trackUserAction } from '@/utils/errorHandler';

// Test data interfaces
export interface TestUser {
  id: string;
  email: string;
  password: string;
  profile: {
    first_name: string;
    last_name: string;
    phone_number: string;
    id_number: string;
    employment_status: string;
    monthly_income: number;
  };
  role: 'admin' | 'loan_officer' | 'client' | 'support';
}

export interface TestLoanApplication {
  amount: number;
  term_months: number;
  purpose: string;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
}

// Test environment setup
export class TestEnvironment {
  private testUsers: TestUser[] = [];
  private testData: any[] = [];

  constructor() {
    this.setupTestData();
  }

  private setupTestData() {
    this.testUsers = [
      {
        id: 'test-admin-001',
        email: 'admin@test.namlend.com',
        password: 'TestAdmin123!',
        profile: {
          first_name: 'Test',
          last_name: 'Administrator',
          phone_number: '+264811234567',
          id_number: '12345678901',
          employment_status: 'employed',
          monthly_income: 50000
        },
        role: 'admin'
      },
      {
        id: 'test-client-001',
        email: 'client@test.namlend.com',
        password: 'TestClient123!',
        profile: {
          first_name: 'Test',
          last_name: 'Client',
          phone_number: '+264812345678',
          id_number: '12345678902',
          employment_status: 'employed',
          monthly_income: 25000
        },
        role: 'client'
      },
      {
        id: 'test-officer-001',
        email: 'officer@test.namlend.com',
        password: 'TestOfficer123!',
        profile: {
          first_name: 'Test',
          last_name: 'Officer',
          phone_number: '+264813456789',
          id_number: '12345678903',
          employment_status: 'employed',
          monthly_income: 35000
        },
        role: 'loan_officer'
      }
    ];
  }

  // Authentication testing
  async testAuthentication(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    
    for (const testUser of this.testUsers) {
      try {
        trackUserAction('test_authentication_start', { email: testUser.email, role: testUser.role });
        
        // Test sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testUser.email,
          password: testUser.password,
          options: {
            data: {
              first_name: testUser.profile.first_name,
              last_name: testUser.profile.last_name
            }
          }
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
          results.push({
            test: 'signup',
            user: testUser.email,
            success: false,
            error: signUpError.message
          });
          continue;
        }

        // Test sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (signInError) {
          results.push({
            test: 'signin',
            user: testUser.email,
            success: false,
            error: signInError.message
          });
          continue;
        }

        // Test profile creation/update
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: signInData.user.id,
            ...testUser.profile,
            email: testUser.email
          });

        if (profileError) {
          results.push({
            test: 'profile',
            user: testUser.email,
            success: false,
            error: profileError.message
          });
          continue;
        }

        // Test role assignment
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: signInData.user.id,
            role: testUser.role
          });

        results.push({
          test: 'complete_auth_flow',
          user: testUser.email,
          success: !roleError,
          error: roleError?.message,
          userId: signInData.user.id
        });

        trackUserAction('test_authentication_complete', { 
          email: testUser.email, 
          role: testUser.role,
          success: !roleError
        });

      } catch (error: any) {
        results.push({
          test: 'auth_exception',
          user: testUser.email,
          success: false,
          error: error.message
        });

        errorLogger.logError({
          message: `Authentication test failed for ${testUser.email}`,
          category: 'authentication' as any,
          severity: 'high' as any,
          context: { testUser: testUser.email, error }
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  // Loan workflow testing
  async testLoanWorkflow(userEmail: string): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    
    try {
      // Sign in as test client
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: this.testUsers.find(u => u.email === userEmail)?.password || 'TestClient123!'
      });

      if (authError) {
        return {
          success: false,
          results: [{ test: 'auth_for_loan_test', success: false, error: authError.message }]
        };
      }

      trackUserAction('test_loan_workflow_start', { userEmail });

      // Test loan application submission
      const testLoanApp: TestLoanApplication = {
        amount: 15000,
        term_months: 12,
        purpose: 'Business expansion',
        interest_rate: 18.5,
        monthly_payment: 1389.50,
        total_repayment: 16674
      };

      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .insert({
          user_id: authData.user.id,
          request_type: 'loan_application',
          request_data: testLoanApp,
          status: 'pending',
          priority: 'normal'
        })
        .select()
        .single();

      results.push({
        test: 'loan_application_submission',
        success: !approvalError,
        error: approvalError?.message,
        approvalRequestId: approvalData?.id
      });

      if (approvalData) {
        // Test approval process
        const { error: approveError } = await supabase
          .from('approval_requests')
          .update({ status: 'approved' })
          .eq('id', approvalData.id);

        results.push({
          test: 'loan_approval',
          success: !approveError,
          error: approveError?.message
        });

        // Test loan record creation
        const { data: loanData, error: loanError } = await supabase
          .from('loans')
          .insert({
            user_id: authData.user.id,
            amount: testLoanApp.amount,
            term_months: testLoanApp.term_months,
            interest_rate: testLoanApp.interest_rate,
            monthly_payment: testLoanApp.monthly_payment,
            total_repayment: testLoanApp.total_repayment,
            purpose: testLoanApp.purpose,
            status: 'approved',
            approval_request_id: approvalData.id
          })
          .select()
          .single();

        results.push({
          test: 'loan_record_creation',
          success: !loanError,
          error: loanError?.message,
          loanId: loanData?.id
        });
      }

      trackUserAction('test_loan_workflow_complete', { 
        userEmail,
        success: results.every(r => r.success)
      });

    } catch (error: any) {
      results.push({
        test: 'loan_workflow_exception',
        success: false,
        error: error.message
      });

      errorLogger.logError({
        message: `Loan workflow test failed for ${userEmail}`,
        category: 'business_logic' as any,
        severity: 'high' as any,
        context: { userEmail, error }
      });
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  // Database connectivity testing
  async testDatabaseConnectivity(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    
    try {
      trackUserAction('test_database_connectivity_start');

      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      results.push({
        test: 'database_connection',
        success: !connectionError,
        error: connectionError?.message
      });

      // Test RLS policies
      const { data: rlsTest, error: rlsError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);

      results.push({
        test: 'rls_policies',
        success: !rlsError,
        error: rlsError?.message
      });

      // Test table existence
      const tables = ['profiles', 'loans', 'approval_requests', 'user_roles', 'payments'];
      for (const table of tables) {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        results.push({
          test: `table_${table}`,
          success: !tableError,
          error: tableError?.message
        });
      }

      trackUserAction('test_database_connectivity_complete', {
        success: results.every(r => r.success)
      });

    } catch (error: any) {
      results.push({
        test: 'database_connectivity_exception',
        success: false,
        error: error.message
      });

      errorLogger.logError({
        message: 'Database connectivity test failed',
        category: 'database' as any,
        severity: 'critical' as any,
        context: { error }
      });
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  // Performance testing
  async testPerformance(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    
    try {
      trackUserAction('test_performance_start');

      // Test query performance
      const startTime = performance.now();
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);

      const profilesTime = performance.now() - startTime;

      results.push({
        test: 'profiles_query_performance',
        success: !profilesError && profilesTime < 2000,
        error: profilesError?.message,
        duration: profilesTime,
        threshold: 2000
      });

      // Test loan data query performance
      const loansStartTime = performance.now();
      
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .limit(50);

      const loansTime = performance.now() - loansStartTime;

      results.push({
        test: 'loans_query_performance',
        success: !loansError && loansTime < 1500,
        error: loansError?.message,
        duration: loansTime,
        threshold: 1500
      });

      trackUserAction('test_performance_complete', {
        success: results.every(r => r.success),
        avgDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
      });

    } catch (error: any) {
      results.push({
        test: 'performance_exception',
        success: false,
        error: error.message
      });

      errorLogger.logError({
        message: 'Performance test failed',
        category: 'system' as any,
        severity: 'medium' as any,
        context: { error }
      });
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  // Cleanup test data
  async cleanup(): Promise<void> {
    try {
      trackUserAction('test_cleanup_start');

      // Clean up test users and related data
      for (const testUser of this.testUsers) {
        // Sign in as test user to get their ID
        const { data: authData } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (authData?.user) {
          // Delete related records
          await supabase.from('payments').delete().eq('user_id', authData.user.id);
          await supabase.from('loans').delete().eq('user_id', authData.user.id);
          await supabase.from('approval_requests').delete().eq('user_id', authData.user.id);
          await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
          await supabase.from('profiles').delete().eq('user_id', authData.user.id);
        }
      }

      trackUserAction('test_cleanup_complete');
    } catch (error: any) {
      errorLogger.logError({
        message: 'Test cleanup failed',
        category: 'system' as any,
        severity: 'low' as any,
        context: { error }
      });
    }
  }

  // Run comprehensive test suite
  async runComprehensiveTests(): Promise<{ success: boolean; summary: any }> {
    trackUserAction('comprehensive_test_suite_start');

    const testResults = {
      database: await this.testDatabaseConnectivity(),
      authentication: await this.testAuthentication(),
      loanWorkflow: await this.testLoanWorkflow('client@test.namlend.com'),
      performance: await this.testPerformance()
    };

    const overallSuccess = Object.values(testResults).every(result => result.success);

    const summary = {
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      results: testResults,
      totalTests: Object.values(testResults).reduce((sum, result) => sum + result.results.length, 0),
      passedTests: Object.values(testResults).reduce((sum, result) => sum + result.results.filter(r => r.success).length, 0),
      failedTests: Object.values(testResults).reduce((sum, result) => sum + result.results.filter(r => !r.success).length, 0)
    };

    trackUserAction('comprehensive_test_suite_complete', {
      success: overallSuccess,
      totalTests: summary.totalTests,
      passedTests: summary.passedTests,
      failedTests: summary.failedTests
    });

    return { success: overallSuccess, summary };
  }
}

// Export singleton instance
export const testEnvironment = new TestEnvironment();
