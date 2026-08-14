'use client';

import { useEffect, useState } from 'react';

type AiProvider = {
  type: string;
  name: string;
  configured: boolean;
};

export function AiSettings() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [preferredProvider, setPreferredProvider] = useState<string>('claude');
  const [preferredModel, setPreferredModel] = useState<string>('');
  const [customTemperature, setCustomTemperature] = useState<number | null>(null);
  const [customMaxTokens, setCustomMaxTokens] = useState<number | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Load available providers
  useEffect(() => {
    async function loadProviders() {
      try {
        const response = await fetch('/api/ai/models');
        if (response.ok) {
          const data = (await response.json()) as { all: AiProvider[] };
          setProviders(data.all);
        }
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    }

    loadProviders();
  }, []);

  // Load user preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const response = await fetch('/api/ai/preferences');
        if (response.ok) {
          const prefs = (await response.json()) as {
            preferredProvider: string;
            preferredModel?: string;
            customTemperature?: number;
            customMaxTokens?: number;
            ollamaUrl?: string;
            systemPrompt?: string;
          };
          setPreferredProvider(prefs.preferredProvider);
          setPreferredModel(prefs.preferredModel || '');
          setCustomTemperature(prefs.customTemperature ?? null);
          setCustomMaxTokens(prefs.customMaxTokens ?? null);
          setOllamaUrl(prefs.ollamaUrl || '');
          setSystemPrompt(prefs.systemPrompt || '');
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setStatus('Saving...');
      const response = await fetch('/api/ai/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredProvider,
          preferredModel: preferredModel || undefined,
          customTemperature: customTemperature ?? undefined,
          customMaxTokens: customMaxTokens ?? undefined,
          ollamaUrl: ollamaUrl || undefined,
          systemPrompt: systemPrompt || undefined,
        }),
      });

      if (response.ok) {
        setStatus('Saved successfully');
        setTimeout(() => setStatus(''), 2000);
      } else {
        const error = (await response.json()) as { error?: string };
        setStatus(`Failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return <div className="panel">Loading AI settings...</div>;
  }

  return (
    <div className="panel" style={{ display: 'grid', gap: 10 }}>
      <h2>AI Provider Settings</h2>

      <label>
        AI Provider
        <select value={preferredProvider} onChange={(e) => setPreferredProvider(e.target.value)}>
          {providers.map((p) => (
            <option key={p.type} value={p.type} disabled={!p.configured}>
              {p.name}
              {!p.configured ? ' (not configured)' : ''}
            </option>
          ))}
        </select>
      </label>

      {preferredProvider === 'ollama' && (
        <label>
          Ollama Base URL
          <input
            type="text"
            value={ollamaUrl}
            placeholder="http://localhost:11434"
            onChange={(e) => setOllamaUrl(e.target.value)}
          />
        </label>
      )}

      {preferredProvider !== 'dictator' && (
        <>
          <label>
            Model Name (optional)
            <input
              type="text"
              value={preferredModel}
              placeholder={
                preferredProvider === 'claude'
                  ? 'claude-sonnet-4-6'
                  : preferredProvider === 'openai'
                    ? 'gpt-4o'
                    : preferredProvider === 'ollama'
                      ? 'mistral'
                      : 'model-name'
              }
              onChange={(e) => setPreferredModel(e.target.value)}
            />
          </label>

          <label>
            Temperature (optional)
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={customTemperature ?? ''}
              placeholder="0.7"
              onChange={(e) => setCustomTemperature(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </label>

          <label>
            Max Tokens (optional)
            <input
              type="number"
              min="1"
              value={customMaxTokens ?? ''}
              placeholder="2048"
              onChange={(e) => setCustomMaxTokens(e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </label>
        </>
      )}

      {preferredProvider === 'dictator' && (
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          Using Dictator Service - no additional configuration needed. This is the Dictator-hosted AI service.
        </p>
      )}

      <label>
        Custom System Prompt (optional)
        <textarea
          value={systemPrompt}
          placeholder="Leave empty to use the default system prompt. This prompt will be used for all AI interactions."
          onChange={(e) => setSystemPrompt(e.target.value)}
          style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '4px 0 0 0' }}>
          {systemPrompt.length}/2000 characters
        </p>
      </label>

      <button type="button" onClick={handleSave}>
        Save AI Settings
      </button>

      {status && <p style={{ fontSize: '0.875rem' }}>{status}</p>}
    </div>
  );
}
