'use client';

import { useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { defaultSettings } from '@/lib/data/default-settings';

export function SettingsForm({ userId }: { userId: string }) {
  const { settings, patchSettings } = useSettings();
  const [status, setStatus] = useState('');

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
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </label>
      <label>
        Command trigger
        <input
          value={settings.commandTrigger}
          placeholder={defaultSettings.commandTrigger}
          onChange={(event) => patchSettings({ commandTrigger: event.target.value })}
        />
      </label>
      <label>
        AI trigger
        <input
          value={settings.aiTrigger}
          placeholder={defaultSettings.aiTrigger}
          onChange={(event) => patchSettings({ aiTrigger: event.target.value })}
        />
      </label>
      <p style={{ margin: 0, color: 'var(--muted)' }}>
        Session override: voice command “change trigger to [word]” only applies to the current tab session.
      </p>
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
        <input value={settings.ttsVoice} onChange={(event) => patchSettings({ ttsVoice: event.target.value })} />
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
