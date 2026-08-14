import { describe, expect, it } from 'vitest';

import { getActivationCommandForLanguage } from '@/lib/data/default-settings';

describe('getActivationCommandForLanguage', () => {
  it('returns default English command trigger', () => {
    const trigger = getActivationCommandForLanguage('en-US', 'command');
    expect(trigger).toBe('Computer');
  });

  it('returns default English AI trigger', () => {
    const trigger = getActivationCommandForLanguage('en-US', 'ai');
    expect(trigger).toBe('Assistant');
  });

  it('returns default Finnish command trigger', () => {
    const trigger = getActivationCommandForLanguage('fi-FI', 'command');
    expect(trigger).toBe('Tietokone');
  });

  it('returns default Finnish AI trigger', () => {
    const trigger = getActivationCommandForLanguage('fi-FI', 'ai');
    expect(trigger).toBe('Avustaja');
  });

  it('returns default Swedish command trigger', () => {
    const trigger = getActivationCommandForLanguage('sv-SE', 'command');
    expect(trigger).toBe('Dator');
  });

  it('returns default Swedish AI trigger', () => {
    const trigger = getActivationCommandForLanguage('sv-SE', 'ai');
    expect(trigger).toBe('Assistent');
  });

  it('uses custom activation commands if provided', () => {
    const customCommands = {
      'en-US': [
        { type: 'command' as const, phrases: ['Hey Computer'], description: 'Custom command' },
        { type: 'ai' as const, phrases: ['Hey Assistant'], description: 'Custom AI' },
      ],
    };

    const commandTrigger = getActivationCommandForLanguage('en-US', 'command', customCommands);
    const aiTrigger = getActivationCommandForLanguage('en-US', 'ai', customCommands);

    expect(commandTrigger).toBe('Hey Computer');
    expect(aiTrigger).toBe('Hey Assistant');
  });

  it('returns default when custom commands missing language', () => {
    const customCommands = {
      'en-US': [
        { type: 'command' as const, phrases: ['Hey Computer'] },
        { type: 'ai' as const, phrases: ['Hey Assistant'] },
      ],
    };

    const trigger = getActivationCommandForLanguage('fi-FI', 'command', customCommands);
    expect(trigger).toBe('Tietokone');
  });

  it('falls back to default when trigger type not found in custom commands', () => {
    const customCommands = {
      'en-US': [
        { type: 'command' as const, phrases: ['Hey Computer'] },
        // Missing AI trigger
      ],
    };

    const trigger = getActivationCommandForLanguage('en-US', 'ai', customCommands);
    expect(trigger).toBe('Assistant');
  });
});
