'use client';

import { useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import type { VoiceNotificationLight } from '@/lib/data/default-settings';
import {
  defaultNotificationLight,
  getDefaultActivationCommandsForLanguage,
} from '@/lib/data/default-settings';

export function VoiceSettings() {
  const { settings, patchSettings } = useSettings();
  const [newPhrase, setNewPhrase] = useState('');
  const [editingCommand, setEditingCommand] = useState<{ language: string; type: 'command' | 'ai' } | null>(null);

  const activationCommands = settings.activationCommands ?? {};
  const notificationLight = settings.voiceNotificationLight ?? defaultNotificationLight;

  const handleAddPhrase = (language: string, type: 'command' | 'ai') => {
    if (!newPhrase.trim()) return;

    const currentCommands = activationCommands[language] ?? getDefaultActivationCommandsForLanguage(language);
    const updated = { ...activationCommands };
    const cmdIndex = currentCommands.findIndex((c) => c.type === type);

    if (cmdIndex >= 0) {
      const newCommands = [...currentCommands];
      if (!newCommands[cmdIndex].phrases.includes(newPhrase.trim())) {
        newCommands[cmdIndex].phrases = [...newCommands[cmdIndex].phrases, newPhrase.trim()];
      }
      updated[language] = newCommands;
    }

    patchSettings({ activationCommands: updated });
    setNewPhrase('');
    setEditingCommand(null);
  };

  const handleRemovePhrase = (language: string, type: 'command' | 'ai', phrase: string) => {
    const currentCommands = activationCommands[language] ?? getDefaultActivationCommandsForLanguage(language);
    const updated = { ...activationCommands };
    const cmdIndex = currentCommands.findIndex((c) => c.type === type);

    if (cmdIndex >= 0) {
      const newCommands = [...currentCommands];
      newCommands[cmdIndex].phrases = newCommands[cmdIndex].phrases.filter((p) => p !== phrase);
      updated[language] = newCommands;
    }

    patchSettings({ activationCommands: updated });
  };

  const handleNotificationLightChange = (key: keyof VoiceNotificationLight, value: string | boolean) => {
    const updated = { ...notificationLight, [key]: value };
    patchSettings({ voiceNotificationLight: updated as VoiceNotificationLight });
  };

  return (
    <div className="panel" style={{ display: 'grid', gap: 10 }}>
      <h2>Voice Settings</h2>

      <div>
        <h3>Activation Commands</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          Customize the voice activation phrases for each language.
        </p>

        {['en-US', 'fi-FI', 'sv-SE'].map((language) => {
          const commands = activationCommands[language] ?? getDefaultActivationCommandsForLanguage(language);
          return (
            <div key={language} style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>{language}</h4>
              {commands.map((cmd) => (
                <div key={`${language}-${cmd.type}`} style={{ marginBottom: 10 }}>
                  <label style={{ fontWeight: 'bold' }}>
                    {cmd.type === 'command' ? 'Dictation' : 'AI'} activation:
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {cmd.phrases.map((phrase) => (
                      <span
                        key={phrase}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          background: 'var(--background-secondary)',
                          borderRadius: 4,
                          fontSize: '0.9rem',
                        }}
                      >
                        {phrase}
                        {cmd.phrases.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePhrase(language, cmd.type, phrase)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '1rem',
                            }}
                            title="Remove phrase"
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  {editingCommand?.language === language && editingCommand?.type === cmd.type ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        type="text"
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        placeholder={`Add new phrase for ${cmd.type}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddPhrase(language, cmd.type);
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddPhrase(language, cmd.type)}
                        style={{ minWidth: 60 }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommand(null);
                          setNewPhrase('');
                        }}
                        style={{ minWidth: 60, background: 'transparent', color: 'var(--muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCommand({ language, type: cmd.type })}
                      style={{ marginTop: 6, background: 'transparent', color: 'var(--teal)' }}
                    >
                      + Add phrase
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3>Notification Light</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          Customize the visual feedback for voice recognition states.
        </p>

        <label>
          Enable notification light
          <input
            type="checkbox"
            checked={notificationLight.enabled}
            onChange={(e) => handleNotificationLightChange('enabled', e.target.checked)}
          />
        </label>

        {notificationLight.enabled ? (
          <>
            <label>
              Listening state color
              <input
                type="color"
                value={notificationLight.listening}
                onChange={(e) => handleNotificationLightChange('listening', e.target.value)}
              />
              <code style={{ marginLeft: 8 }}>{notificationLight.listening}</code>
            </label>

            <label>
              Command recognized color
              <input
                type="color"
                value={notificationLight.commandRecognized}
                onChange={(e) => handleNotificationLightChange('commandRecognized', e.target.value)}
              />
              <code style={{ marginLeft: 8 }}>{notificationLight.commandRecognized}</code>
            </label>

            <label>
              AI activation color
              <input
                type="color"
                value={notificationLight.aiRecognized}
                onChange={(e) => handleNotificationLightChange('aiRecognized', e.target.value)}
              />
              <code style={{ marginLeft: 8 }}>{notificationLight.aiRecognized}</code>
            </label>

            <label>
              Error state color
              <input
                type="color"
                value={notificationLight.error}
                onChange={(e) => handleNotificationLightChange('error', e.target.value)}
              />
              <code style={{ marginLeft: 8 }}>{notificationLight.error}</code>
            </label>

            <label>
              Animation intensity
              <select
                value={notificationLight.intensity}
                onChange={(e) => handleNotificationLightChange('intensity', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}
