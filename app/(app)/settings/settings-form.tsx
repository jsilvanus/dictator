'use client';

import { useEffect, useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';

export function SettingsForm({
  userId,
  instanceCommandTriggerDefault,
  instanceAiTriggerDefault,
}: {
  userId: string;
  instanceCommandTriggerDefault: string;
  instanceAiTriggerDefault: string;
}) {
  const { settings, patchSettings } = useSettings();
  const [status, setStatus] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [sessionOverride, setSessionOverride] = useState<string | null>(null);

  useEffect(() => {
    setSessionOverride(sessionStorage.getItem('temporary-command-trigger'));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const filteredVoices = availableVoices.filter((v) => v.lang.startsWith(settings.language.slice(0, 2)));

  return (
    <div className="panel" style={{ display: 'grid', gap: 10 }}>
      <h1>Preferences</h1>

      <label>
        Language
        <select value={settings.language} onChange={(event) => patchSettings({ language: event.target.value })}>
          <option value="en-US">en-US</option>
          <option value="fi-FI">fi-FI</option>
          <option value="sv-SE">sv-SE</option>
        </select>
      </label>

      <label>
        Hold to talk
        <input
          type="checkbox"
          checked={settings.holdToTalk}
          onChange={(event) => patchSettings({ holdToTalk: event.target.checked })}
        />
      </label>

      <label>
        View font size
        <select
          value={settings.viewFontSize}
          onChange={(event) => patchSettings({ viewFontSize: event.target.value as 'S' | 'M' | 'L' | 'XL' | 'XXL' })}
        >
          <option value="S">S — 14 px</option>
          <option value="M">M — 16 px</option>
          <option value="L">L — 20 px</option>
          <option value="XL">XL — 24 px</option>
          <option value="XXL">XXL — 28 px</option>
        </select>
      </label>

      <label>
        Command trigger
        <input
          value={settings.commandTrigger}
          placeholder={instanceCommandTriggerDefault}
          onChange={(event) => patchSettings({ commandTrigger: event.target.value })}
        />
      </label>

      <label>
        AI trigger
        <input
          value={settings.aiTrigger}
          placeholder={instanceAiTriggerDefault}
          onChange={(event) => patchSettings({ aiTrigger: event.target.value })}
        />
      </label>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>
        Instance defaults: command trigger &ldquo;{instanceCommandTriggerDefault}&rdquo;, AI trigger &ldquo;
        {instanceAiTriggerDefault}&rdquo;.
      </p>

      {sessionOverride ? (
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--amber, #f59e0b)' }}>
          Session override active: command trigger is &ldquo;{sessionOverride}&rdquo;.{' '}
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            onClick={() => {
              sessionStorage.removeItem('temporary-command-trigger');
              setSessionOverride(null);
            }}
          >
            Clear override
          </button>
        </p>
      ) : null}

      <label>
        TTS enabled
        <input
          type="checkbox"
          checked={settings.ttsEnabled}
          onChange={(event) => patchSettings({ ttsEnabled: event.target.checked })}
        />
      </label>

      <label>
        TTS voice
        {filteredVoices.length > 0 ? (
          <select value={settings.ttsVoice} onChange={(event) => patchSettings({ ttsVoice: event.target.value })}>
            <option value="">— system default —</option>
            {filteredVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        ) : (
          <input
            value={settings.ttsVoice}
            placeholder="Voice name (loading…)"
            onChange={(event) => patchSettings({ ttsVoice: event.target.value })}
          />
        )}
      </label>

      <button
        type="button"
        onClick={async () => {
          const response = await fetch(`/api/users/${userId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          });

          setStatus(response.ok ? 'Saved' : 'Failed');
        }}
      >
        Save settings
      </button>

      {status ? <p>{status}</p> : null}
    </div>
  );
}
