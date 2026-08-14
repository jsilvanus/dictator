'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Cpu, Eye, Zap } from 'lucide-react';

type AiContentSource = 'human-dictated' | 'human-written' | 'ai-generated' | 'ai-modified';
type AiRequestScope = 'full-document' | 'selected-text' | 'context-snippet';

interface AiTurnProvenanceData {
  source: AiContentSource;
  confidence?: number;
  contentScope?: AiRequestScope;
  device: string;
  reviewedAt?: number;
  thinkingContent?: string;
  thinkingBudgetTokens?: number;
  createdAt: number;
}

interface AiHistoryTurn {
  sessionId: string;
  turnIndex: number;
  userMessage: string;
  assistantResponse: string;
  provenance: AiTurnProvenanceData | null;
}

interface AiHistoryPanelProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * AI History Panel Component
 * Displays a sidebar with all AI turns for a document with full provenance metadata
 */
export function AiHistoryPanel({ documentId, open, onClose }: AiHistoryPanelProps) {
  const [turns, setTurns] = useState<AiHistoryTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTurn, setExpandedTurn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/documents/${documentId}/ai-history?limit=50`);
        if (!response.ok) throw new Error('Failed to fetch AI history');
        const data = await response.json();
        setTurns(data.turns || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [documentId, open]);

  if (!open) return null;

  const getSourceBadgeColor = (source: AiContentSource) => {
    switch (source) {
      case 'ai-generated':
        return 'bg-green-100 text-green-800';
      case 'ai-modified':
        return 'bg-yellow-100 text-yellow-800';
      case 'human-written':
        return 'bg-blue-100 text-blue-800';
      case 'human-dictated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: AiContentSource) => {
    switch (source) {
      case 'ai-generated':
        return 'AI Generated';
      case 'ai-modified':
        return 'AI Modified';
      case 'human-written':
        return 'Human Written';
      case 'human-dictated':
        return 'Dictated';
      default:
        return 'Unknown';
    }
  };

  const getScopeLabel = (scope?: AiRequestScope) => {
    switch (scope) {
      case 'full-document':
        return 'Full Document';
      case 'selected-text':
        return 'Selection';
      case 'context-snippet':
        return 'Context';
      default:
        return 'Unknown';
    }
  };

  const truncate = (text: string, length: number = 100) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg overflow-hidden flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI History</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close AI history panel"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-gray-500">Loading history...</div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {!loading && turns.length === 0 && !error && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No AI interactions yet
          </div>
        )}

        {turns.map((turn, idx) => {
          const turnId = `${turn.sessionId}-${turn.turnIndex}`;
          const isExpanded = expandedTurn === turnId;
          const prov = turn.provenance;

          return (
            <div
              key={turnId}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* Turn Header (Clickable) */}
              <button
                onClick={() => setExpandedTurn(isExpanded ? null : turnId)}
                className="w-full text-left p-4 flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  {/* Source Badge */}
                  {prov && (
                    <div className="mb-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSourceBadgeColor(
                          prov.source
                        )}`}
                      >
                        {getSourceLabel(prov.source)}
                      </span>
                    </div>
                  )}

                  {/* User Message Preview */}
                  <div className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Q:</span> {truncate(turn.userMessage, 80)}
                  </div>

                  {/* Timestamp and Confidence */}
                  {prov && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Clock size={12} />
                      {new Date(prov.createdAt).toLocaleString()}
                      {prov.confidence !== undefined && (
                        <>
                          <Zap size={12} />
                          {Math.round(prov.confidence * 100)}% confidence
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 text-gray-400">
                  {isExpanded ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  {/* Metadata Section */}
                  {prov && (
                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scope:</span>
                        <span className="font-medium">{getScopeLabel(prov.contentScope)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Device:</span>
                        <span className="font-medium">{prov.device}</span>
                      </div>
                      {prov.thinkingBudgetTokens && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Thinking:</span>
                          <span className="font-medium">{prov.thinkingBudgetTokens} tokens</span>
                        </div>
                      )}
                      {prov.reviewedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reviewed:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Eye size={14} />
                            {new Date(prov.reviewedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Messages */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-xs text-gray-700 mb-1">Your Message</h4>
                      <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-24 overflow-y-auto">
                        {turn.userMessage}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-gray-700 mb-1">AI Response</h4>
                      <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-24 overflow-y-auto">
                        {turn.assistantResponse}
                      </p>
                    </div>

                    {prov?.thinkingContent && (
                      <div>
                        <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
                          <Cpu size={14} />
                          Thinking Process
                        </h4>
                        <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-24 overflow-y-auto font-mono">
                          {prov.thinkingContent}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
