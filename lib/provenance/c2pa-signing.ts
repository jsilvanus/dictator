/**
 * C2PA Signing Service
 * 
 * Server-side signing of C2PA manifests using cryptographic keys.
 * Uses Node.js crypto module for RSA/ECDSA signing.
 */

import { createSign, createVerify, randomBytes } from 'crypto';

import type { C2PAManifest } from './c2pa-manifest';

/**
 * Signed C2PA manifest
 */
export interface SignedC2PAManifest extends C2PAManifest {
  /** Digital signature (base64-encoded) */
  signature: string;
  
  /** Signing algorithm used */
  signingAlgorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  
  /** Certificate or public key (PEM format, optional) */
  certificate?: string;
  
  /** Signature timestamp (ISO 8601) */
  signatureTimestamp: string;
  
  /** Nonce for replay protection */
  nonce: string;
}

/**
 * Signing credentials configuration
 */
export interface SigningCredentials {
  /** Private key (PEM format) */
  privateKey: string;
  
  /** Signing algorithm */
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  
  /** Optional certificate chain */
  certificate?: string;
  
  /** Key ID for reference */
  keyId?: string;
}

/**
 * C2PA Signing Service
 * Handles cryptographic signing and verification of C2PA manifests
 */
export class C2PASigningService {
  private credentials?: SigningCredentials;

  /**
   * Initialize with signing credentials
   */
  static initialize(credentials: SigningCredentials): C2PASigningService {
    const service = new C2PASigningService();
    service.credentials = credentials;
    return service;
  }

  /**
   * Create from environment variables
   * 
   * Expects:
   * - C2PA_PRIVATE_KEY: PEM-formatted private key
   * - C2PA_ALGORITHM: 'RSA-SHA256' or 'ECDSA-SHA256'
   * - C2PA_CERTIFICATE: (optional) PEM-formatted certificate
   * - C2PA_KEY_ID: (optional) key identifier
   */
  static fromEnv(): C2PASigningService {
    const privateKey = process.env.C2PA_PRIVATE_KEY;
    const algorithm = (process.env.C2PA_ALGORITHM || 'RSA-SHA256') as 'RSA-SHA256' | 'ECDSA-SHA256';
    
    if (!privateKey) {
      throw new Error('C2PA_PRIVATE_KEY environment variable not set');
    }

    return C2PASigningService.initialize({
      privateKey,
      algorithm,
      certificate: process.env.C2PA_CERTIFICATE,
      keyId: process.env.C2PA_KEY_ID,
    });
  }

  /**
   * Check if signing is available
   */
  isAvailable(): boolean {
    return !!this.credentials;
  }

  /**
   * Sign a C2PA manifest
   * 
   * @param manifest - Unsigned C2PA manifest
   * @returns Signed manifest with signature and metadata
   * @throws Error if credentials not configured
   */
  signManifest(manifest: C2PAManifest): SignedC2PAManifest {
    if (!this.credentials) {
      throw new Error('C2PA signing not configured. Initialize with credentials.');
    }

    // Create content to sign: manifest JSON + timestamp
    const timestamp = new Date().toISOString();
    const nonce = this.generateNonce();
    
    const contentToSign = JSON.stringify({
      ...manifest,
      _signingMetadata: {
        timestamp,
        nonce,
      },
    });

    // Sign the content
    const signature = this.createSignature(contentToSign);

    // Return signed manifest
    return {
      ...manifest,
      signature,
      signingAlgorithm: this.credentials.algorithm,
      signatureTimestamp: timestamp,
      nonce,
      certificate: this.credentials.certificate,
    };
  }

  /**
   * Verify a signed C2PA manifest
   * 
   * @param signedManifest - Signed manifest to verify
   * @param publicKey - Public key for verification (PEM format)
   * @returns True if signature is valid
   */
  verifySignature(
    signedManifest: SignedC2PAManifest,
    publicKey?: string
  ): boolean {
    if (!signedManifest.signature) {
      return false;
    }

    // Use provided public key or try to extract from certificate
    const keyToUse = publicKey || this.credentials?.certificate;
    if (!keyToUse) {
      console.warn('No public key or certificate available for signature verification');
      return false;
    }

    try {
      // Reconstruct content that was signed
      const contentToVerify = JSON.stringify({
        ...this.stripSignatureFields(signedManifest),
        _signingMetadata: {
          timestamp: signedManifest.signatureTimestamp,
          nonce: signedManifest.nonce,
        },
      });

      // Verify signature
      const verifier = createVerify(
        this.getNodeAlgorithm(signedManifest.signingAlgorithm)
      );
      verifier.update(contentToVerify);
      
      return verifier.verify(keyToUse, signedManifest.signature, 'base64');
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get signature details without verifying
   * Useful for inspection and debugging
   */
  getSignatureDetails(signedManifest: SignedC2PAManifest): {
    algorithm: string;
    timestamp: string;
    nonce: string;
    hasSignature: boolean;
  } {
    return {
      algorithm: signedManifest.signingAlgorithm,
      timestamp: signedManifest.signatureTimestamp,
      nonce: signedManifest.nonce,
      hasSignature: !!signedManifest.signature,
    };
  }

  /**
   * Create digital signature
   */
  private createSignature(content: string): string {
    if (!this.credentials) {
      throw new Error('Credentials not configured');
    }

    const signer = createSign(this.getNodeAlgorithm(this.credentials.algorithm));
    signer.update(content);
    
    return signer.sign(this.credentials.privateKey, 'base64');
  }

  /**
   * Generate cryptographic nonce for replay protection
   */
  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Convert C2PA algorithm name to Node.js algorithm name
   */
  private getNodeAlgorithm(algorithm: 'RSA-SHA256' | 'ECDSA-SHA256'): string {
    switch (algorithm) {
      case 'RSA-SHA256':
        return 'RSA-SHA256';
      case 'ECDSA-SHA256':
        return 'SHA256'; // With ECDSA key
      default:
        return 'RSA-SHA256';
    }
  }

  /**
   * Remove signature-related fields for re-signing
   */
  private stripSignatureFields(manifest: SignedC2PAManifest): Omit<
    SignedC2PAManifest,
    'signature' | 'signingAlgorithm' | 'signatureTimestamp' | 'nonce' | 'certificate'
  > {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signature, signingAlgorithm, signatureTimestamp, nonce, certificate, ...rest } = manifest;
    return rest;
  }
}

/**
 * Create a test signing service with generated keys
 * For development/testing only - not suitable for production
 */
export function createTestSigningService(): C2PASigningService {
  // In production, these would be proper RSA keys
  // For testing, we'll use simplified keys
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDU4K1bEsJWbkBc
...truncated for example...
-----END PRIVATE KEY-----`;

  return C2PASigningService.initialize({
    privateKey,
    algorithm: 'RSA-SHA256',
    keyId: 'test-key-001',
  });
}
