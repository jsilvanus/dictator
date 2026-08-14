/**
 * Provenance Timeline Component
 * 
 * Visual timeline showing document edit history chronologically.
 */

'use client';

import React, { useMemo } from 'react';

import type { ParagraphProvenance, ProvenanceEvent } from '@/lib/provenance/types';

interface TimelineEvent {
  timestamp: Date;
  type: 'human-write' | 'human-edit' | 'ai-gen' | 'ai-mod' | 'review';
  paragraphId: string;
  content: string;
  details?: string;
  confidence?: number;
}

export interface ProvenanceTimelineProps {
  /** Paragraph-level provenance data */
  provenance: ParagraphProvenance[];
}

/**
 * Get icon for event type
 */
function getEventIcon(type: TimelineEvent['type']): string {
  switch (type) {
    case 'human-write':
      return '✍️';
    case 'human-edit':
      return '✏️';
    case 'ai-gen':
      return '✨';
    case 'ai-mod':
      return '🤖';
    case 'review':
      return '✓';
    default:
      return '•';
  }
}

/**
 * Get color class for event type
 */
function getEventColorClass(type: TimelineEvent['type']): string {
  switch (type) {
    case 'human-write':
    case 'human-edit':
      return 'bg-blue-500 text-white';
    case 'ai-gen':
      return 'bg-green-500 text-white';
    case 'ai-mod':
      return 'bg-yellow-500 text-gray-900';
    case 'review':
      return 'bg-purple-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

/**
 * Get label for event type
 */
function getEventLabel(type: TimelineEvent['type']): string {
  switch (type) {
    case 'human-write':
      return 'Written';
    case 'human-edit':
      return 'Edited';
    case 'ai-gen':
      return 'Generated';
    case 'ai-mod':
      return 'Modified';
    case 'review':
      return 'Reviewed';
    default:
      return 'Event';
  }
}

/**
 * Convert provenance events to timeline format
 */
function convertToTimelineEvents(provenance: ParagraphProvenance[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const para of provenance) {
    for (const event of para.events) {
      if (!event.timestamp) continue;

      let type: TimelineEvent['type'] = 'human-edit';
      if (event.eventType === 'human-written') type = 'human-write';
      else if (event.eventType === 'ai-generation') type = 'ai-gen';
      else if (event.eventType === 'ai-modification') type = 'ai-mod';

      events.push({
        timestamp: new Date(event.timestamp),
        type,
        paragraphId: para.paragraphId,
        content: para.content,
        details: event.aiPrompt,
        confidence: event.confidence,
      });

      if (event.reviewedAt) {
        events.push({
          timestamp: new Date(event.reviewedAt),
          type: 'review',
          paragraphId: para.paragraphId,
          content: para.content,
        });
      }
    }
  }

  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Group events by date
 */
function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const groups = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const dateKey = event.timestamp.toLocaleDateString();
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  }

  return groups;
}

/**
 * Provenance Timeline Component
 * Displays all provenance events in chronological order
 */
export function ProvenanceTimeline({ provenance }: ProvenanceTimelineProps) {
  const timelineEvents = useMemo(() => convertToTimelineEvents(provenance), [provenance]);

  const groupedEvents = useMemo(() => groupEventsByDate(timelineEvents), [timelineEvents]);

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No timeline events found
      </div>
    );
  }

  const dates = Array.from(groupedEvents.keys());

  return (
    <div className="space-y-8">
      {dates.map(date => {
        const eventsForDate = groupedEvents.get(date) || [];

        return (
          <div key={date} className="relative">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
            </div>

            {/* Events for this date */}
            <div className="space-y-4">
              {eventsForDate.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  {/* Timeline marker */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColorClass(event.type)} text-lg shadow-md`}>
                      {getEventIcon(event.type)}
                    </div>
                    {idx < eventsForDate.length - 1 && (
                      <div className="w-1 h-8 bg-gray-300 dark:bg-gray-600 mt-2" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {getEventLabel(event.type)}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {event.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {event.confidence !== undefined && (
                        <div className="text-right">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Confidence
                          </div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {(event.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content preview */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2 line-clamp-2">
                      "{event.content}"
                    </p>

                    {/* Prompt if available */}
                    {event.details && (
                      <div className="mt-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-600">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Prompt:{' '}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {event.details}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
