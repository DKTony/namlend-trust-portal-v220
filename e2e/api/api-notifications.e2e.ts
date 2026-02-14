/**
 * API Notifications Orchestration Layer E2E Tests
 *
 * Tests for the api-notifications edge function endpoints
 */

import { test, expect } from '../fixtures';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const API_URL = `${supabaseUrl}/functions/v1/api-notifications`;

test.describe('API Notifications Endpoints', () => {
  let adminToken: string;
  let clientToken: string;
  let clientUserId: string;

  test.beforeEach(async ({ adminSupabase, client1Supabase }) => {
    const { data: adminSession } = await adminSupabase.auth.getSession();
    adminToken = adminSession?.session?.access_token || '';

    const { data: clientSession } = await client1Supabase.auth.getSession();
    clientToken = clientSession?.session?.access_token || '';
    clientUserId = clientSession?.session?.user?.id || '';
  });

  test.describe('GET /list', () => {
    test('user can list their notifications', async () => {
      const response = await fetch(`${API_URL}/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('unread_count');
    });

    test('unauthenticated request returns 401', async () => {
      const response = await fetch(`${API_URL}/list`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('supports type filter', async () => {
      const response = await fetch(`${API_URL}/list?type=system`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('supports read filter', async () => {
      const response = await fetch(`${API_URL}/list?read=false`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('supports pagination', async () => {
      const response = await fetch(`${API_URL}/list?page=1&limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta.limit).toBe(5);
    });
  });

  test.describe('GET /preferences', () => {
    test('user can get their notification preferences', async () => {
      const response = await fetch(`${API_URL}/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('email_enabled');
      expect(data.data).toHaveProperty('sms_enabled');
      expect(data.data).toHaveProperty('push_enabled');
    });
  });

  test.describe('PUT /preferences', () => {
    test('user can update their notification preferences', async () => {
      const response = await fetch(`${API_URL}/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_enabled: true,
          sms_enabled: false,
          marketing: false,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('email_enabled', true);
      expect(data.data).toHaveProperty('sms_enabled', false);
    });
  });

  test.describe('POST /mark-read', () => {
    test('validates required fields', async () => {
      const response = await fetch(`${API_URL}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    test('validates notification_ids is array of UUIDs', async () => {
      const response = await fetch(`${API_URL}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: ['not-a-uuid'],
        }),
      });

      expect(response.status).toBe(400);
    });

    test('marks notifications as read (empty list ok)', async () => {
      const response = await fetch(`${API_URL}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: ['00000000-0000-0000-0000-000000000001'],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('updated_count');
    });
  });

  test.describe('POST /mark-all-read', () => {
    test('user can mark all notifications as read', async () => {
      const response = await fetch(`${API_URL}/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('message');
      expect(data.data).toHaveProperty('updated_count');
    });
  });

  test.describe('DELETE /:id', () => {
    test('returns 404 for non-existent notification', async () => {
      const response = await fetch(`${API_URL}/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  test.describe('POST /send (admin only)', () => {
    test('admin can send notification', async () => {
      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: clientUserId,
          type: 'system',
          title: 'E2E Test Notification',
          message: 'This is a test notification from E2E tests',
          channels: ['app'],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('notification');
      expect(data.data).toHaveProperty('channels_sent');
    });

    test('client cannot send notification', async () => {
      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: clientUserId,
          type: 'system',
          title: 'Test',
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(403);
    });

    test('validates notification type', async () => {
      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: clientUserId,
          type: 'invalid_type',
          title: 'Test',
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('GET /:id', () => {
    test('returns 404 for non-existent notification', async () => {
      const response = await fetch(`${API_URL}/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });
});
