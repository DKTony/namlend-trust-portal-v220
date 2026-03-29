/**
 * Software RSA-SHA256 Signing Provider — Phase 1 implementation.
 *
 * Uses Node.js `crypto` module with PEM keys loaded from environment variables.
 * Suitable for development, testing, and IPS sandbox environments.
 *
 * IMPORTANT: crypto is imported lazily inside each method to avoid Convex's
 * module-level analysis triggering "Dynamic require of 'crypto' is not supported".
 * This file is only ever called from "use node" action files where Node APIs
 * are available at runtime.
 *
 * Environment variables:
 *   IPS_SIGNING_PRIVATE_KEY — PEM-encoded RSA private key (for signing outbound messages)
 *   IPS_BON_PUBLIC_CERT     — PEM-encoded public certificate from BoN (for verifying inbound)
 *   IPS_KEY_ID              — Key identifier included in XML message headers
 */

import type { IpsSigningProvider } from './ipsSigningProvider';

function getCrypto(): typeof import('crypto') {
  // Build a module name the bundler can't statically resolve.
  // At runtime in Node.js, this resolves to require('crypto').
  const mod = ['cry', 'pto'].join('');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(mod);
}

export class SoftwareSigningProvider implements IpsSigningProvider {
  private privateKeyPem: string;
  private publicCertPem: string;
  private keyId: string;

  constructor() {
    this.privateKeyPem = process.env.IPS_SIGNING_PRIVATE_KEY ?? '';
    this.publicCertPem = process.env.IPS_BON_PUBLIC_CERT ?? '';
    this.keyId = process.env.IPS_KEY_ID ?? 'NAMLEND-SIGN-01';
  }

  async sign(data: string): Promise<string> {
    if (!this.privateKeyPem) {
      throw new Error('IPS_SIGNING_PRIVATE_KEY not configured');
    }

    const crypto = getCrypto();
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(data, 'utf8');
    signer.end();
    return signer.sign(this.privateKeyPem, 'base64');
  }

  async verify(data: string, signatureBase64: string, publicKeyPem?: string): Promise<boolean> {
    const certPem = publicKeyPem ?? this.publicCertPem;
    if (!certPem) {
      throw new Error('No public certificate available for verification');
    }

    const crypto = getCrypto();
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(data, 'utf8');
    verifier.end();
    return verifier.verify(certPem, signatureBase64, 'base64');
  }

  async encryptPin(pin: string, hsmPublicKeyPem: string): Promise<string> {
    const crypto = getCrypto();
    const encrypted = crypto.publicEncrypt(
      {
        key: hsmPublicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(pin, 'utf8')
    );
    return encrypted.toString('base64');
  }

  getKeyId(): string {
    return this.keyId;
  }
}
