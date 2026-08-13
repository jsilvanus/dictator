'use client';

/**
 * Phase 3: Device Preferences Settings Component
 * Allows users to configure device priority and conflict resolution settings
 */

import React, { useEffect, useState } from 'react';

interface DevicePreferences {
  androidPriority: number;
  webPriority: number;
  autoResolve: boolean;
  conflictResolutionMode: 'last-write-wins' | '3way-merge' | 'device-priority';
}

interface DevicePreferencesSettingsProps {
  onSave?: (preferences: Partial<DevicePreferences>) => void;
}

export function DevicePreferencesSettings({ onSave }: DevicePreferencesSettingsProps) {
  const [prefs, setPrefs] = useState<DevicePreferences>({
    androidPriority: 50,
    webPriority: 50,
    autoResolve: false,
    conflictResolutionMode: 'last-write-wins',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sync/preferences');

        if (!response.ok) {
          throw new Error('Failed to fetch preferences');
        }

        const data = await response.json();
        setPrefs(data.preferences);
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/sync/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setMessage({
        type: 'success',
        text: 'Preferences saved successfully',
      });

      onSave?.(prefs);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading preferences...</div>;
  }

  return (
    <div className="space-y-4 rounded border border-gray-200 p-4">
      <h3 className="text-lg font-semibold">Device Sync Preferences</h3>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Android Priority</label>
          <input
            type="range"
            min="0"
            max="100"
            value={prefs.androidPriority}
            onChange={(e) => setPrefs({ ...prefs, androidPriority: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-600">{prefs.androidPriority}%</div>
        </div>

        <div>
          <label className="text-sm font-medium">Web Priority</label>
          <input
            type="range"
            min="0"
            max="100"
            value={prefs.webPriority}
            onChange={(e) => setPrefs({ ...prefs, webPriority: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-600">{prefs.webPriority}%</div>
        </div>

        <div>
          <label className="text-sm font-medium">Conflict Resolution Mode</label>
          <select
            value={prefs.conflictResolutionMode}
            onChange={(e) => setPrefs({ ...prefs, conflictResolutionMode: e.target.value as any })}
            className="w-full rounded border border-gray-300 p-2"
          >
            <option value="last-write-wins">Last Write Wins</option>
            <option value="3way-merge">3-Way Merge</option>
            <option value="device-priority">Device Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoResolve"
            checked={prefs.autoResolve}
            onChange={(e) => setPrefs({ ...prefs, autoResolve: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="autoResolve" className="text-sm font-medium">
            Auto-resolve conflicts when possible
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400 hover:bg-blue-700"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {message && (
        <div className={`rounded p-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
