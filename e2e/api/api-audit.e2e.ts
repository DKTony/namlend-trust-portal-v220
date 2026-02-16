/**
 * API Audit Orchestration Layer E2E Tests
 *
 * Tests for the api-audit edge function endpoints
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-audit`;

test.describe('API Audit Endpoints', () => {
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

  test.describe('GET /logs', () => {
    test('admin can list audit logs', async () => {
      const response = await fetch(`${API_URL}/logs`, {
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

    test('loan officer cannot list all audit logs', async () => {
      const response = await fetch(`${API_URL}/logs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('client cannot list audit logs', async () => {
      const response = await fetch(`${API_URL}/logs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/logs`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('supports action filter', async () => {
      const response = await fetch(`${API_URL}/logs?action=LOAN_APPROVED`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('supports table_name filter', async () => {
      const response = await fetch(`${API_URL}/logs?table_name=loans`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('supports date range filter', async () => {
      const response = await fetch(`${API_URL}/logs?startDate=2026-01-01&endDate=2026-01-31`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('supports pagination', async () => {
      const response = await fetch(`${API_URL}/logs?page=1&limit=5`, {
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

  test.describe('GET /logs/:id', () => {
    test('returns 404 for non-existent audit log', async () => {
      const response = await fetch(`${API_URL}/logs/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  test.describe('GET /financial', () => {
    test('admin can access financial operation logs', async () => {
      const response = await fetch(`${API_URL}/financial`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.meta).toHaveProperty('action_summary');
    });

    test('loan officer can access financial operation logs', async () => {
      const response = await fetch(`${API_URL}/financial`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('client cannot access financial operation logs', async () => {
      const response = await fetch(`${API_URL}/financial`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('GET /user/:userId', () => {
    test('admin can get audit logs for specific user', async () => {
      const response = await fetch(`${API_URL}/user/00000000-0000-0000-0000-000000000001`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('logs');
    });

    test('loan officer cannot get user audit logs', async () => {
      const response = await fetch(`${API_URL}/user/00000000-0000-0000-0000-000000000001`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('GET /table/:tableName', () => {
    test('admin can get audit logs for specific table', async () => {
      const response = await fetch(`${API_URL}/table/loans`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('table_name', 'loans');
      expect(data.data).toHaveProperty('logs');
      expect(data.data).toHaveProperty('action_distribution');
    });
  });

  test.describe('GET /summary', () => {
    test('admin can get audit summary', async () => {
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
      expect(data.data.overview).toHaveProperty('total_logs');
      expect(data.data.overview).toHaveProperty('today');
      expect(data.data.overview).toHaveProperty('this_week');
      expect(data.data.overview).toHaveProperty('this_month');
      expect(data.data).toHaveProperty('top_actions');
      expect(data.data).toHaveProperty('top_tables');
    });

    test('loan officer can get audit summary', async () => {
      const response = await fetch(`${API_URL}/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('client cannot get audit summary', async () => {
      const response = await fetch(`${API_URL}/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('GET /actions', () => {
    test('admin can get list of action types', async () => {
      const response = await fetch(`${API_URL}/actions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('actions');
      expect(data.data).toHaveProperty('financial_actions');
      expect(Array.isArray(data.data.financial_actions)).toBe(true);
    });

    test('loan officer can get list of action types', async () => {
      const response = await fetch(`${API_URL}/actions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('GET /export', () => {
    test('admin can export audit logs as JSON', async () => {
      const response = await fetch(
        `${API_URL}/export?startDate=2026-01-01&endDate=2026-01-31&format=json`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('period');
      expect(data.data).toHaveProperty('total_records');
      expect(data.data).toHaveProperty('logs');
    });

    test('admin can export audit logs as CSV', async () => {
      const response = await fetch(
        `${API_URL}/export?startDate=2026-01-01&endDate=2026-01-31&format=csv`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv');
    });

    test('validates required date parameters', async () => {
      const response = await fetch(`${API_URL}/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(400);
    });

    test('loan officer cannot export audit logs', async () => {
      const response = await fetch(`${API_URL}/export?startDate=2026-01-01&endDate=2026-01-31`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });
});
