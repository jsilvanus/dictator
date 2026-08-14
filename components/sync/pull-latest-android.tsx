'use client';

/**
 * Phase 3: Pull Latest from Android Component
 * Button to manually pull the latest version from Android device
 */

import React, { useState } from 'react';

interface PullLatestFromAndroidProps {
  documentId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PullLatestFromAndroid({ documentId, onSuccess, onError }: PullLatestFromAndroidProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePull = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Fetch the latest version from sync endpoint
      const response = await fetch(`/api/documents/${documentId}/sync`);

      if (!response.ok) {
        throw new Error('Failed to pull latest version');
      }

      const data = await response.json();

      // Check if the latest version is from Android
      if (data.document.lastModifiedDevice === 'android') {
        setMessage('Pulled latest version from Android device');
        onSuccess?.();
      } else {
        setMessage('Latest version is already from web');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Error: ${errorMsg}`);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePull}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400 hover:bg-blue-700"
      >
        {loading ? 'Pulling...' : 'Pull Latest from Android'}
      </button>
      {message && <div className="text-xs text-gray-600">{message}</div>}
    </div>
  );
}
