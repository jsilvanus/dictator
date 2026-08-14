/**
 * Provenance Viewer Component
 * 
 * Main component for viewing document provenance information.
 * Shows paragraph-level provenance with timeline and AI confidence scores.
 */

'use client';

import React, { useMemo, useState } from 'react';

import type { ParagraphProvenance } from '@/lib/provenance/types';

import { ParagraphProvenanceCard } from './ParagraphProvenanceCard';
import { ProvenanceAuditTrail } from './ProvenanceAuditTrail';
import { ProvenanceTimeline } from './ProvenanceTimeline';

export interface ProvenanceViewerProps {
  /** Paragraph-level provenance data */
  provenance: ParagraphProvenance[];
  
  /** Document title for context */
  documentTitle?: string;
  
  /** Show audit trail in addition to provenance */
  showAuditTrail?: boolean;
  
  /** Callback when export is requested */
  onExport?: () => void;
  
  /** Allow filtering by content source */
  enableFiltering?: boolean;
}

type ViewMode = 'cards' | 'timeline' | 'audit';
type SourceFilter = 'all' | 'human' | 'ai' | 'reviewed';

/**
 * Provenance Viewer
 * Displays document provenance with multiple visualization modes
 */
export function ProvenanceViewer({
  provenance,
  documentTitle,
  showAuditTrail = true,
  onExport,
  enableFiltering = true,
}: ProvenanceViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Filter provenance based on source
  const filteredProvenance = useMemo(() => {
    if (!enableFiltering || sourceFilter === 'all') return provenance;

    return provenance.filter(para => {
      const hasAiEvent = para.events.some(
        e => e.eventType === 'ai-generation' || e.eventType === 'ai-modification'
      );
      const hasReviewEvent = para.events.some(e => e.reviewedAt);
      const hasHumanEvent = para.events.some(
        e => e.eventType === 'human-written' || e.eventType === 'human-edit'
      );

      switch (sourceFilter) {
        case 'human':
          return hasHumanEvent;
        case 'ai':
          return hasAiEvent;
        case 'reviewed':
          return hasReviewEvent;
        default:
          return true;
      }
    });
  }, [provenance, sourceFilter, enableFiltering]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = provenance.length;
    const aiGenerated = provenance.filter(p =>
      p.events.some(e => e.eventType === 'ai-generation')
    ).length;
    const aiModified = provenance.filter(p =>
      p.events.some(e => e.eventType === 'ai-modification')
    ).length;
    const reviewed = provenance.filter(p =>
      p.events.some(e => e.reviewedAt)
    ).length;

    const avgConfidence = provenance.reduce((sum, p) => {
      const aiEvents = p.events.filter(e => e.eventType.startsWith('ai-'));
      const confidence = aiEvents.length > 0 ? aiEvents[0]?.confidence || 0 : 0;
      return sum + confidence;
    }, 0) / (provenance.length || 1);

    return { total, aiGenerated, aiModified, reviewed, avgConfidence };
  }, [provenance]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Provenance</h1>
        {documentTitle && (
          <p className="text-gray-600 dark:text-gray-300">{documentTitle}</p>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Paragraphs</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-300">
            {stats.aiGenerated}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Generated</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">
            {stats.aiModified}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Modified</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
            {stats.reviewed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Reviewed</div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
            {(stats.avgConfidence * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Timeline
          </button>
          {showAuditTrail && (
            <button
              onClick={() => setViewMode('audit')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'audit'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              Audit Log
            </button>
          )}
        </div>

        {enableFiltering && (
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as SourceFilter)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium"
          >
            <option value="all">All Sources</option>
            <option value="human">Human Only</option>
            <option value="ai">AI Only</option>
            <option value="reviewed">Reviewed Only</option>
          </select>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="ml-auto px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            Export with Provenance
          </button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {viewMode === 'cards' && (
          <div className="space-y-4">
            {filteredProvenance.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No provenance data matches the selected filter
              </p>
            ) : (
              filteredProvenance.map(para => (
                <ParagraphProvenanceCard key={para.paragraphId} provenance={para} />
              ))
            )}
          </div>
        )}

        {viewMode === 'timeline' && (
          <ProvenanceTimeline provenance={filteredProvenance} />
        )}

        {viewMode === 'audit' && showAuditTrail && (
          <ProvenanceAuditTrail provenance={filteredProvenance} />
        )}
      </div>
    </div>
  );
}
