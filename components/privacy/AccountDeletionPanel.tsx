/**
 * AccountDeletionPanel Component
 *
 * Allows users to delete their account and all associated data
 * Provides options for:
 * - Exporting data before deletion
 * - Choosing what to delete
 * - Audit trail of deletions
 */

'use client';

import React, { useState } from 'react';

interface DeletionOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

const DELETION_OPTIONS: DeletionOption[] = [
  {
    id: 'documents',
    label: 'All Documents',
    description: 'Delete all your documents and writing',
    selected: true,
  },
  {
    id: 'ai-sessions',
    label: 'AI Conversation History',
    description: 'Delete all AI interactions and model responses',
    selected: true,
  },
  {
    id: 'settings',
    label: 'Settings & Preferences',
    description: 'Delete all your app settings and preferences',
    selected: true,
  },
  {
    id: 'sync-backups',
    label: 'Cloud Sync & Backups',
    description: 'Delete all cloud copies and backups on our servers',
    selected: true,
  },
  {
    id: 'provider-history',
    label: 'AI Provider History',
    description: 'Request deletion from AI providers (may take 30+ days)',
    selected: false,
  },
  {
    id: 'telemetry',
    label: 'Telemetry & Analytics',
    description: 'Delete all collected telemetry and usage analytics',
    selected: true,
  },
];

export const AccountDeletionPanel: React.FC = () => {
  const [step, setStep] = useState<'warning' | 'options' | 'confirm' | 'processing' | 'complete'>(
    'warning'
  );
  const [options, setOptions] = useState<DeletionOption[]>(DELETION_OPTIONS);
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportBeforeDeletion, setExportBeforeDeletion] = useState(true);

  const toggleOption = (id: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, selected: !opt.selected } : opt)));
  };

  const selectedCount = options.filter((o) => o.selected).length;
  const allSelected = selectedCount === options.length;

  const handleProceedToOptions = () => {
    setStep('options');
  };

  const handleProceedToConfirm = () => {
    setStep('confirm');
  };

  const handleExportAndDelete = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Call deletion API
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedOptions: options.filter((o) => o.selected).map((o) => o.id),
          exportBeforeDeletion,
          confirmationText: confirmText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deletion failed');
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
    }
  };

  if (step === 'warning') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-red-200 bg-red-50 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-red-900">
            <span className="text-3xl">⚠️</span>
            Delete Account & All Data
          </h2>
          <p className="mt-3 text-red-800">
            This is a permanent action. All your data will be deleted and cannot be recovered.
          </p>
        </div>

        <div className="space-y-3 rounded-lg bg-white p-4 border border-red-200">
          <p className="font-semibold text-gray-900">Before you go:</p>
          <ul className="list-inside space-y-2 text-sm text-gray-700">
            <li>✓ Export your documents for your records</li>
            <li>✓ Download your data (ZIP with audit trail)</li>
            <li>✓ This action affects all synced devices</li>
            <li>✓ Cloud backups will be deleted after 30 days</li>
            <li>✓ You can't undo this</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('options')}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors"
          >
            Continue to Deletion Options
          </button>
          <button
            onClick={() => {/* close dialog */}}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'options') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose What to Delete</h2>
          <p className="mt-2 text-gray-600">
            Select which data to delete from your account
          </p>
        </div>

        {/* Export Option */}
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={exportBeforeDeletion}
              onChange={(e) => setExportBeforeDeletion(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-blue-900">
              <strong>Export all data as ZIP</strong> before deletion (recommended for records/compliance)
            </span>
          </label>
        </div>

        {/* Deletion Options */}
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={option.selected}
                onChange={() => toggleOption(option.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleProceedToConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            disabled={selectedCount === 0}
          >
            Continue ({selectedCount} selected)
          </button>
          <button
            onClick={() => setStep('warning')}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    const selectedItems = options.filter((o) => o.selected).map((o) => o.label).join(', ');
    const confirmationRequired = 'DELETE MY ACCOUNT';

    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-red-200 bg-red-50 p-6">
        <div>
          <h2 className="text-2xl font-bold text-red-900">Final Confirmation</h2>
          <p className="mt-2 text-red-800">
            This action cannot be undone. Please review and confirm:
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-white p-4 border border-red-200 space-y-2">
          <p className="font-semibold text-gray-900">Will delete:</p>
          <p className="text-sm text-gray-700">{selectedItems}</p>
          {exportBeforeDeletion && (
            <p className="text-sm text-blue-700 font-medium">
              ✓ Will export data before deletion
            </p>
          )}
        </div>

        {/* Confirmation Input */}
        <div>
          <p className="mb-2 font-semibold text-gray-900">
            Type "{confirmationRequired}" to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationRequired}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-100 p-4 text-sm text-red-800">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExportAndDelete}
            disabled={confirmText !== confirmationRequired || isProcessing}
            className="flex-1 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800 disabled:bg-gray-400 transition-colors"
          >
            {isProcessing ? 'Deleting...' : 'Permanently Delete Account'}
          </button>
          <button
            onClick={() => setStep('options')}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isProcessing}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-green-200 bg-green-50 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-green-900">
            <span className="text-3xl">✅</span>
            Account Deletion Initiated
          </h2>
        </div>

        <div className="rounded-lg bg-white p-4 border border-green-200 space-y-3 text-sm text-gray-700">
          <p>Your account and selected data have been marked for deletion.</p>
          <ul className="list-inside space-y-1 text-sm">
            <li>✓ Local data will be cleared immediately</li>
            <li>✓ Cloud backups will be deleted within 30 days</li>
            <li>✓ AI provider history deletion requests submitted</li>
            <li>✓ Audit log of this deletion has been recorded</li>
          </ul>
          {exportBeforeDeletion && (
            <p className="text-green-800 font-medium">
              Your data export should have downloaded. Keep it safe for your records.
            </p>
          )}
        </div>

        <button
          onClick={() => {/* close/redirect */}}
          className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
};

export default AccountDeletionPanel;
