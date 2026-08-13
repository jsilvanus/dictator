/**
 * DocumentExportButton Component
 *
 * Provides UI for exporting documents with full provenance metadata
 * Includes:
 * - AI interaction history
 * - Audit trail
 * - Privacy policies used
 * - Encryption information
 */

'use client';

import React, { useState } from 'react';

interface DocumentExportButtonProps {
  documentId: string;
  documentTitle: string;
  hasAiHistory?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export const DocumentExportButton: React.FC<DocumentExportButtonProps> = ({
  documentId,
  documentTitle,
  hasAiHistory = false,
  onExportStart,
  onExportComplete,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    onExportStart?.();

    try {
      const response = await fetch(`/api/documents/${documentId}/export-with-provenance`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle}-export-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onExportComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isExporting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export with Provenance
          </>
        )}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Export failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-gray-600">
        Exports your document with full audit trail, AI history, and privacy metadata as a ZIP file
        {hasAiHistory && ' (includes AI interactions)'}
      </p>
    </div>
  );
};

export default DocumentExportButton;
