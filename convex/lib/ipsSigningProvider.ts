/**
 * IPS Signing Provider — abstraction for RSA-SHA256 message signing.
 *
 * Phase 1: SoftwareSigningProvider (Node.js crypto with PEM from env vars)
 * Phase 4: HsmSigningProvider (delegates to HSM microservice)
 *
 * This interface is consumed by ipsAdapter.ts and ipsXmlBuilder.ts.
 * Implementations MUST run in "use node" actions only.
 */

/**
 * Abstraction over RSA-SHA256 signing operations.
 * Allows swapping between software crypto (dev/sandbox) and HSM (production).
 */
export interface IpsSigningProvider {
  /** RSA-SHA256 sign the given data. Returns base64-encoded signature. */
  sign(data: string): Promise<string>;

  /** Verify an RSA-SHA256 signature (base64-encoded) against the given data. */
  verify(data: string, signatureBase64: string, publicKeyPem?: string): Promise<boolean>;

  /** Encrypt a PIN value with the IPS HSM public key. Returns base64-encoded ciphertext. */
  encryptPin(pin: string, hsmPublicKeyPem: string): Promise<string>;

  /** Return the key identifier for the current signing key (included in XML Head). */
  getKeyId(): string;
}

/**
 * Factory to create the appropriate signing provider based on environment config.
 * Reads IPS_SIGNING_MODE env var: 'software' (default) or 'hsm'.
 */
export function createSigningProvider(): IpsSigningProvider {
  // Lazy import to avoid pulling Node.js crypto into non-node contexts
  const mode = process.env.IPS_SIGNING_MODE ?? 'software';

  if (mode === 'hsm') {
    // Phase 4: HSM provider — will be implemented in ipsHsmSigner.ts
    throw new Error(
      'HSM signing provider not yet implemented. Set IPS_SIGNING_MODE=software for now.'
    );
  }

  // Phase 1: Software provider
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SoftwareSigningProvider } = require('./ipsSoftwareSigner');
  return new SoftwareSigningProvider();
}
