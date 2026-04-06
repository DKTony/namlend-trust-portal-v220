/**
 * Convex HTTP Router.
 *
 * Routes:
 *   POST /webhook/ips     — IPS XML/JSON callbacks from Bank of Namibia
 *   POST /webhook/payment — Payment gateway webhooks (PayToday, MTC MoMo, TN Mobile)
 *   GET  /health          — Health check for monitoring
 */

import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { auth } from './auth';
import { buildAckResponseXml } from './lib/ipsXmlBuilder';

// ---------------------------------------------------------------------------
// Signature verification helpers
// ---------------------------------------------------------------------------

/**
 * Verify an HMAC-SHA256 webhook signature (legacy JSON mode).
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

    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
    );

    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

/**
 * Verify an RSA-SHA256 digital signature (XML protocol mode).
 * Uses Web Crypto API (available in Convex V8 isolate).
 */
async function verifyRsaSha256(
  publicKeyPem: string,
  rawBody: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    // Strip PEM headers and decode base64
    const pemBody = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');

    const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
    const sigBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'spki',
      keyBytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const encoder = new TextEncoder();
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes, encoder.encode(rawBody));
  } catch (e) {
    console.error('[webhook/ips] RSA-SHA256 verification error:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Lightweight XML extraction (V8 isolate — no fast-xml-parser available)
// ---------------------------------------------------------------------------

/** Extract a named attribute value from an XML string */
function extractXmlAttr(xml: string, attr: string): string | undefined {
  // Match attr="value" or attr='value'
  const re = new RegExp(`${attr}=["']([^"']*)["']`);
  const match = xml.match(re);
  return match?.[1];
}

/** Extract text content of a named XML element */
function extractXmlElement(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const match = xml.match(re);
  return match?.[1];
}

/** Extract the IPS API name from the root XML element (e.g., "RespPay" from <upi:RespPay>) */
function extractApiName(xml: string): string | undefined {
  const match = xml.match(/<(?:upi:)?(\w+)[\s>]/);
  return match?.[1];
}

/** Extract the Signature element content */
function extractSignature(xml: string): string | undefined {
  return extractXmlElement(xml, 'Signature');
}

/** Remove the Signature element from XML (for verification — sign the body without sig) */
function stripSignature(xml: string): string {
  return xml.replace(/<Signature>[^<]*<\/Signature>\s*/g, '');
}

/** Detect if a string is XML (starts with <? or <upi: or <Resp or <Req) */
function isXml(body: string): boolean {
  const trimmed = body.trimStart();
  return (
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<upi:') ||
    trimmed.startsWith('<Resp') ||
    trimmed.startsWith('<Req')
  );
}

const http = httpRouter();

// Mount Convex Auth endpoints
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
// IPS Webhook — Bank of Namibia callback (supports both XML and legacy JSON)
// ---------------------------------------------------------------------------

http.route({
  path: '/webhook/ips',
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

    // Detect protocol: XML or JSON
    if (isXml(rawBody)) {
      return handleIpsXmlCallback(ctx, request, rawBody);
    } else {
      return handleIpsJsonCallback(ctx, request, rawBody);
    }
  }),
});

// ---------------------------------------------------------------------------
// XML callback handler (IPS async Response protocol)
// ---------------------------------------------------------------------------

async function handleIpsXmlCallback(
  ctx: any,
  request: Request,
  rawBody: string
): Promise<Response> {
  const orgId = process.env.IPS_ORG_ID ?? 'NAMLEND';
  const ts = new Date().toISOString();

  // Extract key fields from XML (lightweight — no parser needed)
  const apiName = extractApiName(rawBody);
  const msgId = extractXmlAttr(rawBody, 'msgId') ?? extractXmlElement(rawBody, 'MsgId');
  const requestMsgId = extractXmlAttr(rawBody, 'reqMsgId');
  const respCode = extractXmlElement(rawBody, 'RespCode') ?? extractXmlAttr(rawBody, 'result');
  const respDescription =
    extractXmlElement(rawBody, 'RespDesc') ?? extractXmlElement(rawBody, 'ErrMsg');

  if (!apiName || !msgId) {
    const ackXml = buildAckResponseXml(
      apiName ?? 'Unknown',
      msgId ?? '',
      'FAILURE',
      ts,
      orgId,
      'MISSING_FIELDS'
    );
    return new Response(ackXml, {
      status: 400,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // RSA-SHA256 signature verification
  const bonPublicCert = process.env.IPS_BON_PUBLIC_CERT;
  if (bonPublicCert) {
    const signature = extractSignature(rawBody);
    if (!signature) {
      console.error('[webhook/ips] Missing Signature element in XML');
      const ackXml = buildAckResponseXml(apiName, msgId, 'FAILURE', ts, orgId, 'MISSING_SIGNATURE');
      return new Response(ackXml, {
        status: 401,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const bodyWithoutSig = stripSignature(rawBody);
    const valid = await verifyRsaSha256(bonPublicCert, bodyWithoutSig, signature);
    if (!valid) {
      console.error('[webhook/ips] RSA-SHA256 signature verification failed');
      const ackXml = buildAckResponseXml(apiName, msgId, 'FAILURE', ts, orgId, 'INVALID_SIGNATURE');
      return new Response(ackXml, {
        status: 401,
        headers: { 'Content-Type': 'application/xml' },
      });
    }
  } else {
    console.warn(
      '[webhook/ips] IPS_BON_PUBLIC_CERT not configured — skipping signature verification'
    );
  }

  // Route to the appropriate handler action
  try {
    await ctx.runAction(internal.actions.ipsAdapter.handleWebhook, {
      apiName,
      msgId,
      requestMsgId,
      respCode,
      respDescription,
      txnData: { rawExtracted: true },
      rawXml: rawBody,
    });

    // Return success ACK
    const ackXml = buildAckResponseXml(apiName, msgId, 'SUCCESS', ts, orgId);
    return new Response(ackXml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('[webhook/ips] Handler error:', error);
    const ackXml = buildAckResponseXml(apiName, msgId, 'FAILURE', ts, orgId, 'PROCESSING_ERROR');
    return new Response(ackXml, {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}

// ---------------------------------------------------------------------------
// Legacy JSON callback handler (json_mock mode)
// ---------------------------------------------------------------------------

async function handleIpsJsonCallback(
  ctx: any,
  request: Request,
  rawBody: string
): Promise<Response> {
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
      console.error('[webhook/ips] HMAC signature verification failed');
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
    // Map legacy JSON format to the new handler args
    const msgId = body.msgId as string;
    const statusMap: Record<string, string> = {
      ACCP: 'processing',
      ACSC: '00', // completed
      RJCT: 'RJCT',
      PDNG: 'processing',
    };

    await ctx.runAction(internal.actions.ipsAdapter.handleWebhook, {
      apiName: 'RespPay',
      msgId: msgId ?? '',
      respCode: body.txStatus === 'ACSC' ? '00' : (body.reasonCode as string | undefined),
      respDescription: body.reasonDescription as string | undefined,
      txnData: body,
    });

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
}

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
