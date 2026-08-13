'use client';

import { useSettings } from '@/components/providers/SettingsProvider';

const languageNames: Record<string, string> = {
  'en-US': 'English (US)',
  'fi-FI': 'Finnish',
  'sv-SE': 'Swedish',
};

export function LanguageIndicator() {
  const { settings } = useSettings();
  const dictationLanguage = settings.dictationLanguage || settings.language;
  const languageName = languageNames[dictationLanguage] || dictationLanguage;

  return (
    <div
      style={{
        padding: '6px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        fontSize: '0.875rem',
        color: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
      title={`Dictation language: ${languageName}`}
    >
      <span style={{ fontSize: '0.75rem' }}>🎤</span>
      <span>{languageName}</span>
    </div>
  );
}
