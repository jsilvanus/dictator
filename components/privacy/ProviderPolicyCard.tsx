/**
 * ProviderPolicyCard Component
 *
 * Displays AI provider privacy policy in a card format
 * Shows privacy rating, data retention, training usage, compliance
 *
 * Used in settings and before AI requests
 */

'use client';

import React from 'react';

import type { AiProviderPolicy } from '@/lib/privacy/types';

interface ProviderPolicyCardProps {
  policy: AiProviderPolicy;
  privacyRating: number; // 0-100
  summary?: string;
  compact?: boolean;
  showLink?: boolean;
}

/**
 * Get color for privacy rating
 */
function getRatingColor(rating: number): string {
  if (rating >= 85) return 'bg-green-100 text-green-900';
  if (rating >= 70) return 'bg-yellow-100 text-yellow-900';
  if (rating >= 50) return 'bg-orange-100 text-orange-900';
  return 'bg-red-100 text-red-900';
}

/**
 * Get icon for privacy rating
 */
function getRatingIcon(rating: number): string {
  if (rating >= 85) return '🟢';
  if (rating >= 70) return '🟡';
  if (rating >= 50) return '🟠';
  return '🔴';
}

export const ProviderPolicyCard: React.FC<ProviderPolicyCardProps> = ({
  policy,
  privacyRating,
  summary,
  compact = false,
  showLink = true,
}) => {
  const trainingText = policy.usesDataForTraining
    ? `Yes${policy.trainingOptOutAvailable ? ' (opt-out available)' : ''}`
    : 'No';

  const retentionText = policy.dataRetentionDays
    ? `${policy.dataRetentionDays} days`
    : 'Indefinite';

  const locationText = policy.processingLocations
    .map((loc) => (loc === 'on-device' ? '🖥️ On-Device' : loc.toUpperCase()))
    .join(', ');

  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold text-gray-900">{policy.displayName}</h4>
            <p className="text-xs text-gray-600 mt-1">
              {getRatingIcon(privacyRating)} Privacy Rating: {privacyRating}/100
            </p>
          </div>
          {showLink && policy.privacyPolicyUrl && (
            <a
              href={policy.privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Policy ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header with Rating */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{policy.displayName}</h3>
          <p className="text-sm text-gray-600 mt-1">{policy.provider}</p>
        </div>
        <div className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 ${getRatingColor(privacyRating)}`}>
          <span className="text-2xl">{getRatingIcon(privacyRating)}</span>
          <span className="text-xs font-bold">{privacyRating}/100</span>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 border border-blue-200">
          <p className="whitespace-pre-wrap font-mono text-xs">{summary}</p>
        </div>
      )}

      {/* Policy Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-4 border-t border-b border-gray-200 py-4">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-600">Processing</p>
          <p className="mt-1 text-sm text-gray-900">{locationText}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-600">Data Retention</p>
          <p className="mt-1 text-sm text-gray-900">{retentionText}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-600">Model Training</p>
          <p className="mt-1 text-sm text-gray-900">{trainingText}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-600">GDPR</p>
          <p className="mt-1 text-sm text-gray-900">
            {policy.gdprCompliant ? '✅ Compliant' : '❌ Not Compliant'}
          </p>
        </div>
      </div>

      {/* Processing Purposes */}
      {policy.processingPurposes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase text-gray-600">Processing Purposes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {policy.processingPurposes.map((purpose) => (
              <span
                key={purpose}
                className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {purpose.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {policy.notes && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-semibold text-xs mb-1">📝 Notes</p>
          <p>{policy.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-600">
          Policy updated: {new Date(policy.updatedAt).toLocaleDateString()}
        </p>
        {showLink && policy.privacyPolicyUrl && (
          <a
            href={policy.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View Full Policy ↗
          </a>
        )}
      </div>
    </div>
  );
};

export default ProviderPolicyCard;
