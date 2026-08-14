'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import { defaultSettings, UserSettings, defaultNotificationLight, getDefaultActivationCommandsForLanguage } from '@/lib/data/default-settings';

type SettingsContextValue = {
  settings: UserSettings;
  setSettings: (next: UserSettings) => void;
  patchSettings: (next: Partial<UserSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Normalize settings for backward compatibility.
 * Ensures all required fields are present and uses defaults for missing ones.
 */
function normalizeSettings(initial?: Partial<UserSettings>): UserSettings {
  const base = { ...defaultSettings, ...initial };

  // Ensure voiceNotificationLight has all required fields
  if (!base.voiceNotificationLight) {
    base.voiceNotificationLight = defaultNotificationLight;
  } else {
    base.voiceNotificationLight = {
      ...defaultNotificationLight,
      ...base.voiceNotificationLight,
    };
  }

  // Ensure activationCommands is populated for the user's language
  if (!base.activationCommands) {
    base.activationCommands = {
      'en-US': getDefaultActivationCommandsForLanguage('en-US'),
      'fi-FI': getDefaultActivationCommandsForLanguage('fi-FI'),
      'sv-SE': getDefaultActivationCommandsForLanguage('sv-SE'),
    };
  } else {
    // Add missing languages to activationCommands
    const languages = ['en-US', 'fi-FI', 'sv-SE'];
    for (const lang of languages) {
      if (!base.activationCommands[lang]) {
        base.activationCommands[lang] = getDefaultActivationCommandsForLanguage(lang);
      }
    }
  }

  return base;
}

export function SettingsProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: Partial<UserSettings>;
}) {
  const [settings, setSettings] = useState<UserSettings>(normalizeSettings(initial));

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      patchSettings: (next: Partial<UserSettings>) => setSettings((prev) => normalizeSettings({ ...prev, ...next })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
