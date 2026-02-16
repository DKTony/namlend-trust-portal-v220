/**
 * API Analytics Orchestration Layer E2E Tests
 *
 * Tests for the api-analytics edge function endpoints
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-analytics`;

test.describe('API Analytics Endpoints', () => {
  test.skip(!supabaseUrl, 'VITE_SUPABASE_URL must be set — skipping Edge Function tests');
  let adminToken: string;
  let loanOfficerToken: string;
  let clientToken: string;

  test.beforeEach(async ({ adminSupabase, loanOfficerSupabase, client1Supabase }) => {
    // Get tokens for each user type
    const { data: adminSession } = await adminSupabase.auth.getSession();
    adminToken = adminSession?.session?.access_token || '';

    const { data: loSession } = await loanOfficerSupabase.auth.getSession();
    loanOfficerToken = loSession?.session?.access_token || '';

    const { data: clientSession } = await client1Supabase.auth.getSession();
    clientToken = clientSession?.session?.access_token || '';
  });

  test.describe('GET /portfolio', () => {
    test('admin can access portfolio summary', async () => {
      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_loans');
      expect(data.data).toHaveProperty('total_disbursed');
      expect(data.data).toHaveProperty('total_outstanding');
      expect(data.data).toHaveProperty('by_status');
    });

    test('loan officer can access portfolio summary', async () => {
      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('client cannot access portfolio summary', async () => {
      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  test.describe('GET /loan-performance', () => {
    test('admin can access loan performance metrics', async () => {
      const response = await fetch(`${API_URL}/loan-performance`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('repayment_rate');
      expect(data.data).toHaveProperty('default_rate');
      expect(data.data).toHaveProperty('average_days_to_first_payment');
    });
  });

  test.describe('GET /collections-stats', () => {
    test('admin can access collections statistics', async () => {
      const response = await fetch(`${API_URL}/collections-stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_overdue');
      expect(data.data).toHaveProperty('overdue_amount');
    });
  });

  test.describe('GET /disbursement-stats', () => {
    test('admin can access disbursement statistics', async () => {
      const response = await fetch(`${API_URL}/disbursement-stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_disbursed');
      expect(data.data).toHaveProperty('by_method');
      expect(data.data).toHaveProperty('by_status');
    });
  });

  test.describe('GET /risk-analysis', () => {
    test('only admin can access risk analysis', async () => {
      const response = await fetch(`${API_URL}/risk-analysis`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('loan officer cannot access risk analysis', async () => {
      const response = await fetch(`${API_URL}/risk-analysis`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('GET /trends', () => {
    test('admin can access trend analysis', async () => {
      const response = await fetch(`${API_URL}/trends?period=30`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('applications');
      expect(data.data).toHaveProperty('approvals');
      expect(data.data).toHaveProperty('disbursements');
    });
  });
});
