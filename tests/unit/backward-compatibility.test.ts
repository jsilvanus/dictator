import { describe, expect, it } from 'vitest';

import { defaultSettings } from '@/lib/data/default-settings';

describe('Backward compatibility', () => {
  it('should handle missing voiceNotificationLight settings', () => {
    const oldSettings = {
      commandTrigger: 'Computer',
      aiTrigger: 'Assistant',
      language: 'en-US',
    };

    const merged = { ...defaultSettings, ...oldSettings };

    expect(merged.voiceNotificationLight).toBeDefined();
    expect(merged.voiceNotificationLight?.enabled).toBe(true);
    expect(merged.voiceNotificationLight?.listening).toBe('#0066ff');
  });

  it('should handle missing activationCommands settings', () => {
    const oldSettings = {
      commandTrigger: 'Computer',
      aiTrigger: 'Assistant',
      language: 'en-US',
    };

    const merged = { ...defaultSettings, ...oldSettings };

    expect(merged.activationCommands).toBeDefined();
    expect(merged.activationCommands?.['en-US']).toBeDefined();
    expect(merged.activationCommands?.['fi-FI']).toBeDefined();
    expect(merged.activationCommands?.['sv-SE']).toBeDefined();
  });

  it('should preserve existing settings when merging with defaults', () => {
    const customSettings = {
      commandTrigger: 'CustomCommand',
      aiTrigger: 'CustomAI',
      language: 'fi-FI',
      ttsEnabled: false,
    };

    const merged = { ...defaultSettings, ...customSettings };

    expect(merged.commandTrigger).toBe('CustomCommand');
    expect(merged.aiTrigger).toBe('CustomAI');
    expect(merged.language).toBe('fi-FI');
    expect(merged.ttsEnabled).toBe(false);
    expect(merged.voiceNotificationLight).toBeDefined();
    expect(merged.activationCommands).toBeDefined();
  });

  it('default settings should include all required fields', () => {
    expect(defaultSettings.commandTrigger).toBeDefined();
    expect(defaultSettings.aiTrigger).toBeDefined();
    expect(defaultSettings.language).toBeDefined();
    expect(defaultSettings.ttsEnabled).toBeDefined();
    expect(defaultSettings.holdToTalk).toBeDefined();
    expect(defaultSettings.viewFontSize).toBeDefined();
    expect(defaultSettings.dictationCommands).toBeDefined();
    expect(defaultSettings.activationCommands).toBeDefined();
    expect(defaultSettings.voiceNotificationLight).toBeDefined();
  });
});
