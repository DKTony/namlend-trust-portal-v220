/**
 * API Collections Orchestration Layer E2E Tests
 *
 * Tests for the api-collections edge function endpoints
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-collections`;

test.describe('API Collections Endpoints', () => {
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

  test.describe('GET /queue', () => {
    test('admin can access collections queue', async () => {
      const response = await fetch(`${API_URL}/queue`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('queue');
      expect(data.data).toHaveProperty('summary');
      expect(data.data.summary).toHaveProperty('total_overdue');
      expect(data.data.summary).toHaveProperty('total_amount');
    });

    test('loan officer can access collections queue', async () => {
      const response = await fetch(`${API_URL}/queue`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loanOfficerToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('client cannot access collections queue', async () => {
      const response = await fetch(`${API_URL}/queue`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/queue`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('supports priority filter', async () => {
      const response = await fetch(`${API_URL}/queue?priority=high`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('GET /case/:loanId', () => {
    test('returns 404 for non-existent loan', async () => {
      const response = await fetch(`${API_URL}/case/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  test.describe('POST /interaction', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing loan_id and other required fields
        }),
      });

      expect(response.status).toBe(400);
    });

    test('validates interaction type', async () => {
      const response = await fetch(`${API_URL}/interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_id: '00000000-0000-0000-0000-000000000000',
          type: 'invalid_type',
          notes: 'Test notes',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('client cannot record interactions', async () => {
      const response = await fetch(`${API_URL}/interaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_id: '00000000-0000-0000-0000-000000000000',
          type: 'phone_call',
          notes: 'Test notes',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('POST /promise', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/promise`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBe(400);
    });

    test('validates amount is positive', async () => {
      const response = await fetch(`${API_URL}/promise`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_id: '00000000-0000-0000-0000-000000000000',
          promised_amount: -100,
          promised_date: '2026-01-20',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('POST /escalate', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/escalate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing loan_id and level
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('GET /reminders', () => {
    test('admin can get payment reminders', async () => {
      const response = await fetch(`${API_URL}/reminders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
    });

    test('supports status filter', async () => {
      const response = await fetch(`${API_URL}/reminders?status=pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('POST /reminder', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBe(400);
    });

    test('validates channel type', async () => {
      const response = await fetch(`${API_URL}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loan_id: '00000000-0000-0000-0000-000000000000',
          channel: 'invalid_channel',
          scheduled_for: '2026-01-20',
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
