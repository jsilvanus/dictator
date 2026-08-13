'use client';

/**
 * Phase 3: Conflict Resolution UI Component
 * Displays unresolved conflicts and allows users to resolve them
 */

import React, { useEffect, useState } from 'react';

interface Conflict {
  id: string;
  documentId: string;
  title: string;
  baseVersion: Record<string, unknown>;
  androidVersion: Record<string, unknown>;
  webVersion: Record<string, unknown>;
  createdAt: string;
}

interface ConflictResolutionUIProps {
  onConflictResolved?: () => void;
}

export function ConflictResolutionUI({ onConflictResolved }: ConflictResolutionUIProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'manual' | 'device-priority' | '3way-merge'>('3way-merge');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sync/conflicts');

        if (!response.ok) {
          throw new Error('Failed to fetch conflicts');
        }

        const data = await response.json();
        setConflicts(data.conflicts);
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConflicts();
  }, []);

  const handleResolveConflict = async (conflictId: string) => {
    try {
      setResolvingId(conflictId);
      setMessage(null);

      const response = await fetch(`/api/sync/conflicts/${conflictId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve conflict');
      }

      setMessage({
        type: 'success',
        text: 'Conflict resolved successfully',
      });

      // Remove resolved conflict from list
      setConflicts(conflicts.filter((c) => c.id !== conflictId));
      setSelectedConflictId(null);
      onConflictResolved?.();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading conflicts...</div>;
  }

  if (conflicts.length === 0) {
    return <div className="rounded bg-green-50 p-3 text-sm text-green-800">No conflicts detected. All documents are in sync.</div>;
  }

  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId);

  return (
    <div className="space-y-4 rounded border border-gray-200 p-4">
      <h3 className="text-lg font-semibold">
        Unresolved Conflicts ({conflicts.length})
      </h3>

      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="cursor-pointer rounded border border-orange-200 bg-orange-50 p-3 hover:bg-orange-100"
            onClick={() => setSelectedConflictId(conflict.id === selectedConflictId ? null : conflict.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{conflict.title}</div>
                <div className="text-xs text-gray-600">{new Date(conflict.createdAt).toLocaleString()}</div>
              </div>
              <span className="text-xs font-medium text-orange-700">CONFLICT</span>
            </div>
          </div>
        ))}
      </div>

      {selectedConflict && (
        <div className="space-y-3 rounded bg-gray-50 p-3">
          <div className="text-sm font-medium">Resolve "{selectedConflict.title}"</div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full rounded border border-gray-300 p-2 text-sm"
            >
              <option value="3way-merge">3-Way Merge</option>
              <option value="device-priority">Device Priority</option>
              <option value="manual">Manual (review versions)</option>
            </select>
          </div>

          {strategy === 'manual' && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Android Version:</div>
              <pre className="max-h-32 overflow-auto rounded bg-white p-2 text-xs">
                {JSON.stringify(selectedConflict.androidVersion, null, 2)}
              </pre>

              <div className="text-xs font-medium">Web Version:</div>
              <pre className="max-h-32 overflow-auto rounded bg-white p-2 text-xs">
                {JSON.stringify(selectedConflict.webVersion, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleResolveConflict(selectedConflict.id)}
              disabled={resolvingId === selectedConflict.id}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:bg-gray-400 hover:bg-blue-700"
            >
              {resolvingId === selectedConflict.id ? 'Resolving...' : 'Resolve'}
            </button>
            <button
              onClick={() => setSelectedConflictId(null)}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`rounded p-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
