/**
 * Export Dialog Component
 * 
 * UI for selecting export format, packaging strategy, and signing options.
 */

'use client';

import React, { useState } from 'react';

export type ExportFormat = 'json' | 'markdown' | 'text' | 'html' | 'pdf' | 'csv';
export type PackagingStrategy = 'sidecar' | 'embedded';

export interface ExportOptions {
  format: ExportFormat;
  packaging: PackagingStrategy;
  sign: boolean;
  includeProvenance: boolean;
  includeAuditTrail: boolean;
  compressData?: boolean;
}

export interface ExportDialogProps {
  /** Callback when export is confirmed */
  onExport: (options: ExportOptions) => void | Promise<void>;
  
  /** Callback when dialog is closed */
  onClose: () => void;
  
  /** Whether export is in progress */
  isLoading?: boolean;
  
  /** Whether C2PA signing is available */
  signingAvailable?: boolean;
}

/**
 * Format recommendations
 */
const formatRecommendations: Record<ExportFormat, { packaging: PackagingStrategy; description: string }> = {
  markdown: { packaging: 'sidecar', description: 'Best for markdown documents' },
  text: { packaging: 'sidecar', description: 'Plain text with separate provenance files' },
  html: { packaging: 'embedded', description: 'Web-ready HTML with embedded metadata' },
  pdf: { packaging: 'embedded', description: 'PDF with embedded provenance metadata' },
  json: { packaging: 'embedded', description: 'JSON format with embedded provenance' },
  csv: { packaging: 'sidecar', description: 'CSV with separate provenance sidecar' },
};

/**
 * Export Dialog Component
 * Allows user to configure export options
 */
export function ExportDialog({
  onExport,
  onClose,
  isLoading = false,
  signingAvailable = true,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [packaging, setPackaging] = useState<PackagingStrategy>(
    formatRecommendations[format].packaging
  );
  const [sign, setSign] = useState(false);
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [compressData, setCompressData] = useState(false);

  const recommendation = formatRecommendations[format];

  const handleFormatChange = (newFormat: ExportFormat) => {
    setFormat(newFormat);
    setPackaging(formatRecommendations[newFormat].packaging);
  };

  const handleExport = async () => {
    try {
      await onExport({
        format,
        packaging,
        sign,
        includeProvenance,
        includeAuditTrail,
        compressData,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 border-b border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Export Document
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(formatRecommendations).map(([fmt, { description }]) => (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt as ExportFormat)}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    format === fmt
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {fmt}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Packaging Strategy */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Packaging Strategy
            </label>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-3 mb-3 text-sm text-blue-800 dark:text-blue-200">
              Recommended: <strong>{recommendation.packaging}</strong> packaging
            </div>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                     style={{ borderColor: packaging === 'sidecar' ? '#3b82f6' : '' }}>
                <input
                  type="radio"
                  name="packaging"
                  value="sidecar"
                  checked={packaging === 'sidecar'}
                  onChange={() => setPackaging('sidecar')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Sidecar Files
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Export content + separate .provenance.json, .c2pa.json sidecars
                  </div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                     style={{ borderColor: packaging === 'embedded' ? '#3b82f6' : '' }}>
                <input
                  type="radio"
                  name="packaging"
                  value="embedded"
                  checked={packaging === 'embedded'}
                  onChange={() => setPackaging('embedded')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Embedded Metadata
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Single file with provenance embedded in comments or metadata
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Provenance Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Provenance Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeProvenance}
                  onChange={e => setIncludeProvenance(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Include Provenance Data
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Paragraph-level edit history and AI confidence scores
                  </div>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAuditTrail}
                  onChange={e => setIncludeAuditTrail(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Include Audit Trail
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Complete modification history and access logs
                  </div>
                </div>
              </label>
              {packaging === 'embedded' && (
                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={compressData}
                    onChange={e => setCompressData(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Compress Embedded Data
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Gzip compress provenance to reduce file size
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* C2PA Signing */}
          {signingAvailable && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Digital Signature
              </label>
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={sign}
                  onChange={e => setSign(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Sign with C2PA
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Create cryptographically signed manifest for authenticity verification
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
              Export Summary
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                Format: <strong className="text-gray-900 dark:text-gray-100">{format.toUpperCase()}</strong>
              </li>
              <li>
                Packaging: <strong className="text-gray-900 dark:text-gray-100">{packaging}</strong>
              </li>
              {sign && (
                <li>
                  Signing: <strong className="text-gray-900 dark:text-gray-100">C2PA</strong>
                </li>
              )}
              {includeProvenance && (
                <li className="text-green-600 dark:text-green-400">
                  ✓ Provenance included
                </li>
              )}
              {includeAuditTrail && (
                <li className="text-green-600 dark:text-green-400">
                  ✓ Audit trail included
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⟳</span>
                Exporting...
              </>
            ) : (
              <>
                <span>↓</span>
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
