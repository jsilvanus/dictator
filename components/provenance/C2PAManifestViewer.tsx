/**
 * C2PA Manifest Viewer Component
 * 
 * Displays and verifies C2PA digital signatures and manifest information.
 */

'use client';

import React, { useState } from 'react';

export interface C2PASignature {
  algorithm: string;
  timestamp: string;
  nonce: string;
  signature: string;
  verified?: boolean;
  verificationError?: string;
}

export interface C2PAManifest {
  version: string;
  createdAt: string;
  documentTitle?: string;
  documentAuthor?: string;
  paragraphCount: number;
  aiContentPercentage: number;
  signature?: C2PASignature;
  claimGenerations?: Array<{
    claim: string;
    timestamp: string;
  }>;
}

export interface C2PAManifestViewerProps {
  /** C2PA manifest data */
  manifest: C2PAManifest;
  
  /** Whether to show verification controls */
  showVerification?: boolean;
  
  /** Callback to verify signature */
  onVerify?: (signature: C2PASignature) => Promise<boolean>;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: 'verified' | 'unverified' | 'failed' }) {
  const styles = {
    verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unverified: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const labels = {
    verified: '✓ Verified',
    unverified: '○ Unverified',
    failed: '✕ Failed',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

/**
 * C2PA Manifest Viewer Component
 * Displays C2PA manifest information and allows signature verification
 */
export function C2PAManifestViewer({
  manifest,
  showVerification = true,
  onVerify,
}: C2PAManifestViewerProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [showSignatureDetails, setShowSignatureDetails] = useState(false);

  const handleVerifySignature = async () => {
    if (!manifest.signature || !onVerify) return;

    setVerifying(true);
    try {
      const result = await onVerify(manifest.signature);
      setVerificationResult(result);
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult(false);
    } finally {
      setVerifying(false);
    }
  };

  const signatureStatus = manifest.signature?.verified
    ? 'verified'
    : verificationResult === false
      ? 'failed'
      : 'unverified';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              C2PA Manifest
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Coalition for Content Provenance and Authenticity
            </p>
          </div>
          {manifest.signature && (
            <StatusBadge status={signatureStatus} />
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Manifest Metadata */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Manifest Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Version
              </label>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {manifest.version}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Created
              </label>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {new Date(manifest.createdAt).toLocaleString()}
              </p>
            </div>

            {manifest.documentTitle && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                  Document Title
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">{manifest.documentTitle}</p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Paragraphs
              </label>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {manifest.paragraphCount}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                AI Content
              </label>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {(manifest.aiContentPercentage * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Signature Information */}
        {manifest.signature && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Digital Signature
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Algorithm
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {manifest.signature.algorithm}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Timestamp
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {new Date(manifest.signature.timestamp).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Nonce (Replay Protection)
                </label>
                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs mt-1 break-all">
                  {manifest.signature.nonce}
                </p>
              </div>

              {/* Verify button */}
              {showVerification && onVerify && (
                <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                  {verificationResult === null ? (
                    <button
                      onClick={handleVerifySignature}
                      disabled={verifying}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : 'Verify Signature'}
                    </button>
                  ) : (
                    <div
                      className={`px-4 py-2 rounded-lg text-center font-medium ${
                        verificationResult
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {verificationResult ? '✓ Signature Valid' : '✕ Signature Invalid'}
                    </div>
                  )}
                </div>
              )}

              {/* Signature details */}
              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                <button
                  onClick={() => setShowSignatureDetails(!showSignatureDetails)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-300 hover:underline"
                >
                  {showSignatureDetails ? 'Hide' : 'Show'} Full Signature
                </button>
                {showSignatureDetails && (
                  <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                      {manifest.signature.signature}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Claim Generations */}
        {manifest.claimGenerations && manifest.claimGenerations.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Claim Generation History
            </h4>
            <div className="space-y-2">
              {manifest.claimGenerations.map((claim, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium min-w-6">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-gray-100">{claim.claim}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(claim.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Signature Notice */}
        {!manifest.signature && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This document has not been digitally signed. Sign the document to create a
              verifiable C2PA manifest.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 text-center text-xs text-gray-600 dark:text-gray-400">
        <p>
          C2PA manifests provide cryptographic proof of provenance and authenticity for digital
          content.
        </p>
        <a
          href="https://c2pa.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Learn more about C2PA
        </a>
      </div>
    </div>
  );
}
