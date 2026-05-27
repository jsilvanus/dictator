'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import { defaultSettings, UserSettings } from '@/lib/data/default-settings';

type SettingsContextValue = {
  settings: UserSettings;
  setSettings: (next: UserSettings) => void;
  patchSettings: (next: Partial<UserSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: Partial<UserSettings>;
}) {
  const [settings, setSettings] = useState<UserSettings>({ ...defaultSettings, ...initial });

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      patchSettings: (next: Partial<UserSettings>) => setSettings((prev) => ({ ...prev, ...next })),
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
