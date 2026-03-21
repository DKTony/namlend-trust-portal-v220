/**
 * Convex HTTP Router.
 * Replaces Supabase Edge Function webhook handlers.
 *
 * Routes:
 *   POST /webhook/ips     — IPS transaction status callbacks from Bank of Namibia
 *   POST /webhook/payment — Payment gateway webhooks (PayToday, MTC MoMo, TN Mobile)
 *   GET  /health          — Health check for monitoring
 */

import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { auth } from './auth';

// ---------------------------------------------------------------------------
// HMAC-SHA256 webhook signature verification (Web Crypto API — Convex/Deno)
// ---------------------------------------------------------------------------

/**
 * Verify an HMAC-SHA256 webhook signature.
 *
 * @param secret  Shared secret (from Convex env var)
 * @param rawBody Raw request body as text (MUST be the exact bytes received)
 * @param signature Signature from the incoming header (hex-encoded)
 * @returns true if the signature matches
 */
async function verifyHmacSha256(
  secret: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode hex signature to bytes
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
    );

    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

const http = httpRouter();

// Mount Convex Auth endpoints: /auth/signin, /auth/signout, /auth/token, etc.
auth.addHttpRoutes(http);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'namlend-convex', ts: Date.now() }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }),
});

// ---------------------------------------------------------------------------
// IPS Webhook — Bank of Namibia callback
// ---------------------------------------------------------------------------

http.route({
  path: '/webhook/ips',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Read raw body text first so we can verify the HMAC before parsing
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return new Response(JSON.stringify({ error: 'Cannot read request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // HMAC-SHA256 signature verification
    const ipsSecret = process.env.IPS_WEBHOOK_SECRET;
    const signature = request.headers.get('X-IPS-Signature') ?? request.headers.get('X-Signature');

    if (ipsSecret) {
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing signature header' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const valid = await verifyHmacSha256(ipsSecret, rawBody, signature);
      if (!valid) {
        console.error('[webhook/ips] Signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn(
        '[webhook/ips] IPS_WEBHOOK_SECRET not configured — skipping signature verification'
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      await ctx.runAction(internal.actions.ipsAdapter.handleWebhook, { payload: body });
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[webhook/ips] Handler error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
});

// ---------------------------------------------------------------------------
// Payment Gateway Webhook — PayToday, MTC MoMo, TN Mobile
// ---------------------------------------------------------------------------

http.route({
  path: '/webhook/payment',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return new Response(JSON.stringify({ error: 'Cannot read request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // HMAC-SHA256 signature verification
    const paymentSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const signature =
      request.headers.get('X-PayToday-Signature') ??
      request.headers.get('X-Signature') ??
      request.headers.get('X-Webhook-Signature');

    if (paymentSecret) {
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing signature header' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const valid = await verifyHmacSha256(paymentSecret, rawBody, signature);
      if (!valid) {
        console.error('[webhook/payment] Signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn(
        '[webhook/payment] PAYMENT_WEBHOOK_SECRET not configured — skipping signature verification'
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      await ctx.runAction(internal.actions.ipsAdapter.handlePaymentWebhook, { payload: body });
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[webhook/payment] Handler error:', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
});

export default http;
