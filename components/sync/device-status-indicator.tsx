'use client';

/**
 * Phase 3: Device Status Indicator Component
 * Displays sync status and device information for a document
 */

import React, { useEffect, useState } from 'react';

interface DeviceStatusIndicatorProps {
  documentId: string;
}

interface SyncStatus {
  documentId: string;
  title: string;
  lastSyncedAt: string;
  conflictStatus: 'none' | 'resolved' | 'unresolved';
  pendingChanges: number;
  hasPendingSync: boolean;
}

export function DeviceStatusIndicator({ documentId }: DeviceStatusIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sync/status');

        if (!response.ok) {
          throw new Error('Failed to fetch sync status');
        }

        const data = await response.json();
        const docStatus = data.documents.find((d: SyncStatus) => d.documentId === documentId);
        setStatus(docStatus || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [documentId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading sync status...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Sync status error: {error}</div>;
  }

  if (!status) {
    return <div className="text-sm text-gray-500">No sync status available</div>;
  }

  const getConflictColor = (conflict: string) => {
    switch (conflict) {
      case 'unresolved':
        return 'text-red-600';
      case 'resolved':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <div className="flex items-center gap-4 rounded bg-gray-50 p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${getConflictColor(status.conflictStatus)}`} />
          <span className="text-xs font-medium capitalize">{status.conflictStatus} Sync</span>
        </div>

        <div className="text-xs text-gray-600">
          Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
        </div>

        {status.hasPendingSync && <div className="text-xs text-blue-600">Pending sync...</div>}

        {status.pendingChanges > 0 && <div className="text-xs text-orange-600">{status.pendingChanges} pending changes</div>}
      </div>
    </div>
  );
}
