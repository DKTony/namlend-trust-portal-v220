/**
 * API Reconciliation Orchestration Layer E2E Tests
 *
 * Tests for the api-reconciliation edge function endpoints
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-reconciliation`;

test.describe('API Reconciliation Endpoints', () => {
  test.skip(!supabaseUrl, 'VITE_SUPABASE_URL must be set — skipping Edge Function tests');
  let adminToken: string;
  let loanOfficerToken: string;
  let clientToken: string;

  test.beforeEach(async ({ adminSupabase, loanOfficerSupabase, client1Supabase }) => {
    const { data: adminSession } = await adminSupabase.auth.getSession();
    adminToken = adminSession?.session?.access_token || '';

    const { data: loSession } = await loanOfficerSupabase.auth.getSession();
    loanOfficerToken = loSession?.session?.access_token || '';

    const { data: clientSession } = await client1Supabase.auth.getSession();
    clientToken = clientSession?.session?.access_token || '';
  });

  test.describe('GET /runs', () => {
    test('admin can list reconciliation runs', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('total');
    });

    test('loan officer can list reconciliation runs', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('client cannot list reconciliation runs', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  test.describe('POST /runs', () => {
    test('admin can create reconciliation run', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `E2E Test Run ${Date.now()}`,
          start_date: '2026-01-01',
          end_date: '2026-01-31',
          notes: 'Created by E2E test',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('status', 'pending');
    });

    test('loan officer cannot create reconciliation run', async () => {
      const response = await fetch(`${API_URL}/runs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Run',
          start_date: '2026-01-01',
          end_date: '2026-01-31',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('GET /unmatched', () => {
    test('admin can get unmatched transactions', async () => {
      const response = await fetch(`${API_URL}/unmatched`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
    });
  });

  test.describe('GET /summary', () => {
    test('admin can get reconciliation summary', async () => {
      const response = await fetch(`${API_URL}/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('overview');
      expect(data.data.overview).toHaveProperty('total_transactions');
      expect(data.data.overview).toHaveProperty('matched');
      expect(data.data.overview).toHaveProperty('unmatched');
      expect(data.data.overview).toHaveProperty('match_rate');
    });

    test('loan officer can get reconciliation summary', async () => {
      const response = await fetch(`${API_URL}/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('POST /auto-match', () => {
    test('admin can trigger auto-match', async () => {
      const response = await fetch(`${API_URL}/auto-match`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('matched_count');
      expect(data.data).toHaveProperty('unmatched_remaining');
    });
  });

  test.describe('POST /import', () => {
    test('admin can import bank transactions', async () => {
      const response = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'fnb',
          transactions: [
            {
              external_id: `TEST-${Date.now()}-001`,
              amount: 1000,
              date: '2026-01-15',
              reference: 'TEST-REF-001',
              description: 'Test transaction',
              type: 'credit',
            },
          ],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('imported_count', 1);
    });

    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'invalid_source',
          transactions: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
