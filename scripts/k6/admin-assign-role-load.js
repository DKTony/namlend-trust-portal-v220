import http from 'k6/http';
import { check, sleep } from 'k6';

// Usage:
// SUPABASE_FUNCTION_URL=https://<project-ref>.functions.supabase.co/admin-assign-role \
// AUTH_BEARER=ey... \
// TARGET_USER_ID=<uuid> \
// k6 run scripts/k6/admin-assign-role-load.js

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.001'], // <0.1% failures
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  const url = __ENV.SUPABASE_FUNCTION_URL;
  const token = __ENV.AUTH_BEARER; // Prefer a short-lived admin JWT; avoid permanent service role key
  const targetUserId = __ENV.TARGET_USER_ID;
  const targetRole = __ENV.TARGET_ROLE || 'loan_officer';

  const payload = JSON.stringify({
    target_user_id: targetUserId,
    target_role: targetRole,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    timeout: '30s',
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  sleep(0.5);
}
