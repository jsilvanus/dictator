/**
 * SensitiveDataWarningDialog Component
 *
 * Displays a warning dialog when sensitive data is detected in content
 * before it's sent to a cloud AI provider.
 *
 * User can:
 * - Review detected sensitive data types
 * - Choose to proceed anyway
 * - Redact sensitive data before sending
 * - Cancel the operation
 */

'use client';

import React, { useState } from 'react';

import type { DetectedSensitiveData, SensitiveDataType } from '@/lib/privacy/types';

interface SensitiveDataWarningDialogProps {
  isOpen: boolean;
  detectedData: DetectedSensitiveData[];
  dataTypes: SensitiveDataType[];
  warningMessage: string | null;
  onProceed: () => void;
  onRedact: () => void;
  onCancel: () => void;
  isRedacting?: boolean;
  provider?: string;
}

/**
 * Get a human-readable description for a sensitive data type
 */
function getSensitiveDataDescription(type: SensitiveDataType): string {
  const descriptions: Record<SensitiveDataType, string> = {
    'credit-card': 'Credit Card Number',
    ssn: 'Social Security Number',
    phone: 'Phone Number',
    email: 'Email Address',
    'api-key': 'API Key or Token',
    password: 'Password Field',
    'jwt-token': 'JWT Authentication Token',
    'auth-header': 'Authorization Header',
    'private-key': 'Private Key or Certificate',
    'database-connection': 'Database Connection String',
  };
  return descriptions[type] || type;
}

/**
 * Get color/severity for sensitive data type
 */
function getSeverityColor(type: SensitiveDataType): string {
  switch (type) {
    case 'api-key':
    case 'private-key':
    case 'password':
    case 'jwt-token':
    case 'auth-header':
    case 'database-connection':
      return 'text-red-600'; // Critical
    case 'credit-card':
    case 'ssn':
      return 'text-orange-600'; // High
    case 'phone':
    case 'email':
      return 'text-yellow-600'; // Medium
    default:
      return 'text-gray-600';
  }
}

export const SensitiveDataWarningDialog: React.FC<SensitiveDataWarningDialogProps> = ({
  isOpen,
  detectedData,
  dataTypes,
  warningMessage,
  onProceed,
  onRedact,
  onCancel,
  isRedacting = false,
  provider = 'the AI provider',
}) => {
  const [selectedType, setSelectedType] = useState<SensitiveDataType | null>(
    dataTypes[0] || null
  );

  if (!isOpen) {
    return null;
  }

  const filteredData = selectedType
    ? detectedData.filter((d) => d.type === selectedType)
    : detectedData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-red-600">
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Sensitive Data Detected
          </h2>
          <p className="mt-2 text-gray-700">
            Your content contains information that should be protected before sending to{' '}
            <strong>{provider}</strong>.
          </p>
        </div>

        {/* Warning Message */}
        {warningMessage && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200">
            {warningMessage}
          </div>
        )}

        {/* Data Types Summary */}
        <div className="mb-6">
          <h3 className="mb-3 font-semibold text-gray-900">Detected Types:</h3>
          <div className="flex flex-wrap gap-2">
            {dataTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedType === type
                    ? `${getSeverityColor(type)} bg-gray-100 ring-2 ring-offset-2`
                    : `${getSeverityColor(type)} bg-gray-50 hover:bg-gray-100`
                }`}
              >
                {getSensitiveDataDescription(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Findings */}
        {filteredData.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-gray-900">
              {filteredData.length} instance{filteredData.length > 1 ? 's' : ''} found:
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-4">
              {filteredData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-mono text-gray-900">
                      {item.snippet}
                    </p>
                    <p className="text-xs text-gray-600">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900 border border-blue-200">
          <p className="font-semibold mb-2">💡 Tips:</p>
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>Use "Redact" to automatically remove sensitive data before sending</li>
            <li>Send only selected text when possible, not the full document</li>
            <li>Consider using local AI models (Ollama, Dictator) for sensitive content</li>
            <li>Review your provider's privacy policy in Settings</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isRedacting}
          >
            Cancel
          </button>
          <button
            onClick={onRedact}
            className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-medium text-white hover:bg-yellow-700 transition-colors disabled:bg-gray-400"
            disabled={isRedacting}
          >
            {isRedacting ? 'Redacting...' : '🔒 Redact & Send'}
          </button>
          <button
            onClick={onProceed}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors disabled:bg-gray-400"
            disabled={isRedacting}
          >
            Send Anyway
          </button>
        </div>

        {/* Additional Info */}
        <p className="mt-4 text-xs text-gray-600 text-center">
          Your choice will be logged for audit and privacy compliance purposes.
        </p>
      </div>
    </div>
  );
};

export default SensitiveDataWarningDialog;
