/**
 * Selection Permission Dialog Component
 * Shows PII warnings and handles permission granting via voice or UI
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { SensitiveDataType } from '@/lib/privacy/types';
import {
  formatPiiTypesForVoice,
  generatePermissionVoiceFeedback,
} from '@/lib/privacy/SelectionPermissionManager';

interface SelectionPermissionDialogProps {
  isOpen: boolean;
  selectedText: string;
  detectedPiiTypes: SensitiveDataType[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  onAllow: (scope: 'once' | 'document' | 'always') => void;
  onCancel: () => void;
  onEdit: () => void;
  ttsEnabled?: boolean;
  onSpeak?: (text: string) => void;
}

const PII_DESCRIPTIONS: Record<SensitiveDataType, string> = {
  'credit-card': 'Credit Card Number',
  ssn: 'Social Security Number',
  phone: 'Phone Number',
  email: 'Email Address',
  'api-key': 'API Key',
  'auth-token': 'Authentication Token',
  password: 'Password',
  ip: 'IP Address',
  'license-plate': 'License Plate',
  'bank-account': 'Bank Account Number',
  'routing-number': 'Routing Number',
  url: 'URL',
};

const RISK_COLORS = {
  low: 'bg-yellow-50 border-yellow-200',
  medium: 'bg-orange-50 border-orange-200',
  high: 'bg-red-50 border-red-200',
};

const RISK_TEXT_COLORS = {
  low: 'text-yellow-800',
  medium: 'text-orange-800',
  high: 'text-red-800',
};

export function SelectionPermissionDialog({
  isOpen,
  selectedText,
  detectedPiiTypes,
  confidence,
  riskLevel,
  onAllow,
  onCancel,
  onEdit,
  ttsEnabled = false,
  onSpeak,
}: SelectionPermissionDialogProps) {
  const [voiceMode, setVoiceMode] = useState(false);
  const speakTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-read permission request if voice is enabled
  useEffect(() => {
    if (isOpen && voiceMode && onSpeak) {
      const feedback = generatePermissionVoiceFeedback(detectedPiiTypes, 'model');

      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }

      onSpeak(feedback);

      // Listen for voice responses
      setVoiceMode(true);
    }

    return () => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
    };
  }, [isOpen, voiceMode, detectedPiiTypes, onSpeak]);

  if (!isOpen) {
    return null;
  }

  const preview = selectedText.length > 200 ? selectedText.slice(0, 200) + '...' : selectedText;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog">
      <div
        className={`bg-white rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden ${RISK_COLORS[riskLevel]}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className={`text-lg font-semibold ${RISK_TEXT_COLORS[riskLevel]}`}>
            {riskLevel === 'high' && '⚠️ Sensitive Information Detected'}
            {riskLevel === 'medium' && '⚠️ Personal Information Detected'}
            {riskLevel === 'low' && 'ℹ️ Information Confirmation'}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Risk level and confidence */}
          <div className="text-sm text-gray-600">
            <p>
              <strong>Risk Level:</strong> {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
            </p>
            <p>
              <strong>Confidence:</strong> {(confidence * 100).toFixed(0)}%
            </p>
          </div>

          {/* Detected PII types */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Detected Information:</p>
            <div className="flex flex-wrap gap-2">
              {detectedPiiTypes.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1 bg-white rounded-full text-sm font-medium border"
                  role="status"
                  aria-label={`Detected: ${PII_DESCRIPTIONS[type]}`}
                >
                  {PII_DESCRIPTIONS[type]}
                </span>
              ))}
            </div>
          </div>

          {/* Text preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Selected Text:</p>
            <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-auto max-h-24 whitespace-pre-wrap break-words">
              {preview}
            </pre>
          </div>

          {/* Warning */}
          <div className="p-3 bg-white rounded border border-gray-200 text-sm text-gray-700">
            <p>
              <strong>Privacy Notice:</strong> Only the selected text will be sent to the AI
              provider. Review the text above before allowing.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
          {/* Permission scope buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onAllow('once')}
              className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition"
              aria-label="Allow once"
            >
              Allow Once
            </button>
            <button
              onClick={() => onAllow('document')}
              className="px-3 py-2 bg-blue-400 text-white text-sm font-medium rounded hover:bg-blue-500 transition"
              aria-label="Allow for this document"
            >
              For Document
            </button>
            <button
              onClick={() => onAllow('always')}
              className="px-3 py-2 bg-blue-300 text-white text-sm font-medium rounded hover:bg-blue-400 transition"
              aria-label="Allow always"
            >
              Always
            </button>
          </div>

          {/* Cancel and Edit */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded hover:bg-gray-400 transition"
              aria-label="Cancel and do not send"
            >
              Cancel
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded hover:bg-yellow-600 transition"
              aria-label="Edit selection"
            >
              Edit Selection
            </button>
          </div>

          {/* Voice mode toggle */}
          {ttsEnabled && (
            <button
              onClick={() => setVoiceMode(!voiceMode)}
              className={`w-full px-4 py-2 text-sm font-medium rounded transition ${
                voiceMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
              }`}
              aria-label={voiceMode ? 'Disable voice mode' : 'Enable voice mode'}
            >
              {voiceMode ? '🎤 Voice Mode Active' : '🎤 Enable Voice Mode'}
            </button>
          )}
        </div>

        {/* Voice hint */}
        {voiceMode && (
          <div className="px-6 py-3 bg-blue-100 border-t border-blue-200 text-sm text-blue-800 text-center">
            Listening... Say "allow" to proceed or "cancel" to reject.
          </div>
        )}
      </div>
    </div>
  );
}
