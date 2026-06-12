import { ConvexError } from 'convex/values';

export const IPS_ALIAS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const HANDLE_RE = /^[a-z0-9.-]{3,20}$/;

export function normalizeIpsHandle(input: string): string {
  return input.trim().toLowerCase();
}

export function validateIpsHandle(input: string): { handle: string } {
  const handle = normalizeIpsHandle(input);

  if (!HANDLE_RE.test(handle)) {
    throw new ConvexError({
      code: 'INVALID_VPA',
      message:
        'Handle must be 3-20 lowercase characters using only letters, numbers, dots, and hyphens.',
    });
  }

  if (handle.startsWith('.') || handle.endsWith('.') || handle.includes('..')) {
    throw new ConvexError({
      code: 'INVALID_VPA',
      message: 'Handle cannot start or end with a dot or contain consecutive dots.',
    });
  }

  return { handle };
}

export function assertAliasAvailable(existing: { status?: string; updatedAt?: number } | null) {
  if (!existing) return;

  if (existing.status !== 'DEREGISTERED') {
    throw new ConvexError({
      code: 'ALIAS_TAKEN',
      message: 'This payment address is already registered.',
    });
  }

  const updatedAt = existing.updatedAt ?? 0;
  if (Date.now() - updatedAt < IPS_ALIAS_COOLDOWN_MS) {
    throw new ConvexError({
      code: 'ALIAS_COOLDOWN',
      message: 'This payment address is cooling down after deregistration.',
    });
  }
}

export function assertAliasUsable(alias: {
  status?: string;
  syncedWithIps?: boolean;
  userId?: unknown;
}) {
  if (alias.status !== 'ACTIVE' || !alias.syncedWithIps) {
    throw new ConvexError({
      code: 'ALIAS_NOT_USABLE',
      message: 'The payment address must be active and confirmed by IPS before it can be used.',
    });
  }
}

function isSensitiveKey(key: string): boolean {
  return /(pin|otp|mobile|phone|account|acct|acc|credential|secret|token|key|cert|signature|idvalue|aadhaar)/i.test(
    key
  );
}

export function redactIpsPayload<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactIpsPayload(item)) as T;
  if (typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? '[REDACTED]' : redactIpsPayload(entry);
  }
  return output as T;
}

export function redactIpsXml(xml: string): string {
  return xml
    .replace(/<Signature>[\s\S]*?<\/Signature>/gi, '<Signature>[REDACTED]</Signature>')
    .replace(
      /\b(pin|otp|mobile|phone|account|acct|accRefNumber|maskedAccnumber|credential|secret|token|key|cert|signature|aadhaarNo|value)=["'][^"']*["']/gi,
      (_match, key) => `${key}="[REDACTED]"`
    )
    .replace(
      /<(Pin|OTP|Otp|Mobile|Account|AccountRef|Credential|Secret|Token|Key|Cert)>[\s\S]*?<\/\1>/gi,
      (_match, tag) => `<${tag}>[REDACTED]</${tag}>`
    );
}

export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash.toString(16).padStart(8, '0');
}
