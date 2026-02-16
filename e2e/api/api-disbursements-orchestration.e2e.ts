/**
 * API Disbursements Orchestration Layer E2E Tests
 *
 * Tests for the api-disbursements edge function endpoints
 * (separate from disbursements-rls.e2e.ts which tests direct RLS)
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-disbursements`;

test.describe('API Disbursements Orchestration Endpoints', () => {
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

  test.describe('GET /list', () => {
    test('admin can list disbursements', async () => {
      const response = await fetch(`${API_URL}/list`, {
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

    test('loan officer can list disbursements', async () => {
      const response = await fetch(`${API_URL}/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('client cannot list disbursements', async () => {
      const response = await fetch(`${API_URL}/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/list`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('supports status filter', async () => {
      const response = await fetch(`${API_URL}/list?status=pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('supports pagination', async () => {
      const response = await fetch(`${API_URL}/list?page=1&limit=5`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta.limit).toBe(5);
    });
  });

  test.describe('GET /pending', () => {
    test('admin can get pending disbursements', async () => {
      const response = await fetch(`${API_URL}/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('disbursements');
      expect(data.data).toHaveProperty('summary');
      expect(data.data.summary).toHaveProperty('pending');
      expect(data.data.summary).toHaveProperty('approved');
      expect(data.data.summary).toHaveProperty('total_amount');
    });

    test('loan officer can get pending disbursements', async () => {
      const response = await fetch(`${API_URL}/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('GET /queue', () => {
    test('admin can get disbursement queue', async () => {
      const response = await fetch(`${API_URL}/queue`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('queue');
      expect(data.data).toHaveProperty('summary');
      expect(data.data.summary).toHaveProperty('total_count');
      expect(data.data.summary).toHaveProperty('total_amount');
      expect(data.data.summary).toHaveProperty('by_status');
    });
  });

  test.describe('POST /approve', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    test('returns 404 for non-existent disbursement', async () => {
      const response = await fetch(`${API_URL}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disbursement_id: '00000000-0000-0000-0000-000000000000',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  test.describe('POST /fail', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/fail`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disbursement_id: '00000000-0000-0000-0000-000000000000',
          // Missing reason field
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('GET /:id', () => {
    test('returns 404 for non-existent disbursement', async () => {
      const response = await fetch(`${API_URL}/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });
});
