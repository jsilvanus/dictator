'use client';

import { useEffect, useState } from 'react';

export function DocumentAiSettings({ documentId, onClose }: { documentId: string; onClose?: () => void }) {
  const [systemPromptOverride, setSystemPromptOverride] = useState<string>('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Load document settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/settings`);
        if (response.ok) {
          const settings = (await response.json()) as { systemPromptOverride?: string };
          setSystemPromptOverride(settings.systemPromptOverride || '');
        }
      } catch (error) {
        console.error('Failed to load document settings:', error);
        setStatus('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [documentId]);

  const handleSave = async () => {
    try {
      setStatus('Saving...');
      const response = await fetch(`/api/documents/${documentId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPromptOverride: systemPromptOverride || undefined,
        }),
      });

      if (response.ok) {
        setStatus('Saved successfully');
        setTimeout(() => {
          setStatus('');
          onClose?.();
        }, 1500);
      } else {
        const error = (await response.json()) as { error?: string };
        setStatus(`Failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleClear = async () => {
    try {
      setStatus('Clearing...');
      const response = await fetch(`/api/documents/${documentId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPromptOverride: undefined,
        }),
      });

      if (response.ok) {
        setSystemPromptOverride('');
        setStatus('Cleared successfully');
        setTimeout(() => setStatus(''), 1500);
      } else {
        const error = (await response.json()) as { error?: string };
        setStatus(`Failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9375rem' }}>Document AI Settings</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0 0 12px 0' }}>
          Override the system prompt for this document only. Leave empty to use your global AI settings.
        </p>
      </div>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>System Prompt Override (optional)</span>
        <textarea
          value={systemPromptOverride}
          placeholder="Leave empty to use global settings. This prompt will be used only for this document's AI interactions."
          onChange={(e) => setSystemPromptOverride(e.target.value)}
          style={{
            minHeight: '120px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            padding: 8,
            border: '1px solid var(--border)',
            borderRadius: 4,
          }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '4px 0 0 0' }}>
          {systemPromptOverride.length}/2000 characters
        </p>
      </label>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {systemPromptOverride && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '6px 12px',
              fontSize: '0.875rem',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Clear Override
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '6px 12px',
            fontSize: '0.875rem',
            background: 'var(--purple, #7F77DD)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>

      {status && <p style={{ fontSize: '0.875rem', color: status.includes('Error') ? 'var(--error)' : 'var(--muted)' }}>{status}</p>}
    </div>
  );
}
