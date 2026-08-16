/**
 * Paragraph Provenance Card Component
 * 
 * Displays details for a single paragraph including source, edits, and AI confidence.
 */

'use client';

import React from 'react';

import type { ProvenanceEvent } from '@/lib/provenance/types';
import type { ParagraphProvenance } from '@/lib/provenance/types';

/**
 * Badge component for event types
 */
function EventBadge({ event }: { event: ProvenanceEvent }) {
  const getColorClasses = () => {
    switch (event.eventType) {
      case 'human-written':
      case 'human-edit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ai-generation':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ai-modification':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getLabel = () => {
    switch (event.eventType) {
      case 'human-written':
        return 'Human Written';
      case 'human-edit':
        return 'Human Edit';
      case 'ai-generation':
        return 'AI Generated';
      case 'ai-modification':
        return 'AI Modified';
      default:
        return event.eventType;
    }
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getColorClasses()}`}>
      {getLabel()}
    </span>
  );
}

/**
 * Confidence indicator
 */
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let colorClass = 'bg-red-500';
  
  if (confidence >= 0.8) colorClass = 'bg-green-500';
  else if (confidence >= 0.6) colorClass = 'bg-yellow-500';
  else if (confidence >= 0.4) colorClass = 'bg-orange-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-12">
        {percentage}%
      </span>
    </div>
  );
}

export interface ParagraphProvenanceCardProps {
  provenance: ParagraphProvenance;
}

/**
 * Paragraph Provenance Card
 * Shows all provenance information for a single paragraph
 */
export function ParagraphProvenanceCard({ provenance }: ParagraphProvenanceCardProps) {
  const latestEvent = provenance.events[0];
  const aiEvents = provenance.events.filter(e => e.eventType.startsWith('ai-'));
  const humanEvents = provenance.events.filter(e => e.eventType.startsWith('human-'));

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      {/* Header with paragraph excerpt */}
      <div className="mb-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm italic mb-3 line-clamp-2">
          &quot;{provenance.content}&quot;
        </p>
        <div className="flex flex-wrap gap-2">
          {provenance.events.map((event, idx) => (
            <EventBadge key={idx} event={event} />
          ))}
        </div>
      </div>

      {/* Main provenance details */}
      {latestEvent && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Source information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Source
              </label>
              <p className="text-gray-600 dark:text-gray-400">
                {latestEvent.eventType.includes('ai') ? 'AI Generated' : 'Human Written'}
              </p>
            </div>

            {latestEvent.timestamp && (
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Last Modified
                </label>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(latestEvent.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* AI confidence if applicable */}
          {aiEvents.length > 0 && aiEvents[0]?.confidence !== undefined && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                AI Confidence
              </label>
              <ConfidenceIndicator confidence={aiEvents[0].confidence} />
            </div>
          )}

          {/* AI model and provider */}
          {latestEvent.aiModel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  AI Model
                </label>
                <p className="text-gray-600 dark:text-gray-400">{latestEvent.aiModel}</p>
              </div>
              {latestEvent.aiProvider && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Provider
                  </label>
                  <p className="text-gray-600 dark:text-gray-400">{latestEvent.aiProvider}</p>
                </div>
              )}
            </div>
          )}

          {/* Prompt used for AI generation */}
          {latestEvent.aiPrompt && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                AI Prompt
              </label>
              <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm">
                {latestEvent.aiPrompt}
              </p>
            </div>
          )}

          {/* Review information */}
          {latestEvent.reviewedAt && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50 dark:bg-purple-900 p-3 rounded">
              <div>
                <label className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Reviewed By
                </label>
                <p className="text-purple-600 dark:text-purple-400">
                  {latestEvent.reviewedBy || 'User'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Review Date
                </label>
                <p className="text-purple-600 dark:text-purple-400">
                  {new Date(latestEvent.reviewedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Edit history summary */}
          {provenance.events.length > 1 && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Edit History ({provenance.events.length} events)
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {provenance.events.map((event, idx) => (
                  <div key={idx} className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{idx === 0 ? 'Latest: ' : ''}</span>
                    <EventBadge event={event} />
                    {event.timestamp && (
                      <span className="ml-2">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with human/AI summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{humanEvents.length} human edits</span>
        <span>{aiEvents.length} AI edits</span>
        {latestEvent?.reviewedAt && <span>✓ Reviewed</span>}
      </div>
    </div>
  );
}
