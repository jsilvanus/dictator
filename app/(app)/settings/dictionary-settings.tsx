'use client';

import { useEffect, useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { type DictationCommand,getDefaultCommandsForLanguage } from '@/lib/data/default-settings';

export function DictionarySettings() {
  const { settings, patchSettings } = useSettings();
  const [commands, setCommands] = useState<DictationCommand[]>(
    settings.dictationCommands || getDefaultCommandsForLanguage(settings.dictationLanguage || settings.language),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DictationCommand | null>(null);

  const dictationLanguage = settings.dictationLanguage || settings.language;

  useEffect(() => {
    // When language changes, reset commands to defaults if empty
    if (!settings.dictationCommands || settings.dictationCommands.length === 0) {
      const defaults = getDefaultCommandsForLanguage(dictationLanguage);
      setCommands(defaults);
      patchSettings({ dictationCommands: defaults });
    }
  }, [dictationLanguage, settings.dictationCommands, patchSettings]);

  const handleLanguageChange = (newLanguage: string) => {
    patchSettings({ dictationLanguage: newLanguage });
    const defaults = getDefaultCommandsForLanguage(newLanguage);
    setCommands(defaults);
    patchSettings({ dictationCommands: defaults });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...commands[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updated = [...commands];
      updated[editingIndex] = editForm;
      setCommands(updated);
      patchSettings({ dictationCommands: updated });
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleDelete = (index: number) => {
    const updated = commands.filter((_, i) => i !== index);
    setCommands(updated);
    patchSettings({ dictationCommands: updated });
  };

  const handleAddCommand = () => {
    const newCommand: DictationCommand = {
      name: '',
      voicePhrases: [''],
      description: '',
    };
    setEditingIndex(commands.length);
    setEditForm(newCommand);
  };

  const handleAddNewPhrase = () => {
    if (editForm) {
      setEditForm({
        ...editForm,
        voicePhrases: [...editForm.voicePhrases, ''],
      });
    }
  };

  const handleRemovePhrase = (phraseIndex: number) => {
    if (editForm && editForm.voicePhrases.length > 1) {
      setEditForm({
        ...editForm,
        voicePhrases: editForm.voicePhrases.filter((_, i) => i !== phraseIndex),
      });
    }
  };

  const handlePhraseChange = (phraseIndex: number, value: string) => {
    if (editForm) {
      const updated = [...editForm.voicePhrases];
      updated[phraseIndex] = value;
      setEditForm({ ...editForm, voicePhrases: updated });
    }
  };

  const handleResetToDefaults = () => {
    const defaults = getDefaultCommandsForLanguage(dictationLanguage);
    setCommands(defaults);
    patchSettings({ dictationCommands: defaults });
  };

  return (
    <div className="panel" style={{ display: 'grid', gap: 15 }}>
      <h2>Dictation Dictionary</h2>

      <label>
        Dictation Language
        <select value={dictationLanguage} onChange={(e) => handleLanguageChange(e.target.value)}>
          <option value="en-US">English (US)</option>
          <option value="fi-FI">Finnish</option>
          <option value="sv-SE">Swedish</option>
        </select>
      </label>

      <div>
        <div style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <h3 style={{ margin: 0, flex: 1 }}>Dictation Commands</h3>
          <button type="button" onClick={handleAddCommand} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
            + Add Command
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            style={{ padding: '5px 10px', fontSize: '0.9rem', background: 'var(--muted-bg)' }}
          >
            Reset to Defaults
          </button>
        </div>

        {editingIndex !== null && editForm ? (
          <div style={{ border: '1px solid var(--border)', padding: 15, marginBottom: 15, borderRadius: 4 }}>
            <h4 style={{ marginTop: 0 }}>
              {editingIndex === commands.length ? 'Add New Command' : 'Edit Command'}
            </h4>

            <label style={{ marginBottom: 10, display: 'block' }}>
              Command Name
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., new paragraph"
                style={{ width: '100%', marginTop: 5 }}
              />
            </label>

            <label style={{ marginBottom: 10, display: 'block' }}>
              Description (optional)
              <input
                type="text"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="e.g., Insert a new paragraph"
                style={{ width: '100%', marginTop: 5 }}
              />
            </label>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>
                Voice Phrases (one per line)
              </label>
              {editForm.voicePhrases.map((phrase, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => handlePhraseChange(i, e.target.value)}
                    placeholder={`Phrase ${i + 1}`}
                    style={{ flex: 1 }}
                  />
                  {editForm.voicePhrases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhrase(i)}
                      style={{ padding: '5px 10px', background: 'var(--danger)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddNewPhrase}
                style={{ marginTop: 5, padding: '5px 10px', fontSize: '0.9rem' }}
              >
                + Add Phrase
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleSaveEdit}
                style={{ padding: '8px 15px', background: 'var(--primary)' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: '8px 15px', background: 'var(--muted-bg)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          {commands.map((cmd, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--border)',
                padding: 12,
                borderRadius: 4,
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{cmd.name}</div>
                  {cmd.description && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: 6 }}>
                      {cmd.description}
                    </div>
                  )}
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    Phrases: <span style={{ fontStyle: 'italic' }}>{cmd.voicePhrases.join(', ')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    style={{ padding: '5px 10px', fontSize: '0.9rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    style={{ padding: '5px 10px', fontSize: '0.9rem', background: 'var(--danger)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>
        Dictation commands allow you to control document editing with voice. Each command can have multiple voice
        phrases that trigger the same action.
      </p>
    </div>
  );
}
