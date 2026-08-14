export type FontSizeLevel = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type DictationCommand = {
  name: string;
  voicePhrases: string[]; // e.g., ["new paragraph", "new line"]
  description?: string;
};

export type ActivationCommand = {
  type: 'command' | 'ai'; // 'command' for commandTrigger, 'ai' for aiTrigger
  phrases: string[];
  description?: string;
};

export type VoiceNotificationLight = {
  enabled: boolean;
  listening: string; // color code for listening state (e.g., "#0066ff")
  commandRecognized: string; // color code for command recognized
  aiRecognized: string; // color code for AI activation
  error: string; // color code for error state
  intensity: 'low' | 'medium' | 'high'; // animation intensity
};

export type UserSettings = {
  commandTrigger: string;
  aiTrigger: string;
  language: string;
  dictationLanguage?: string;
  ttsEnabled: boolean;
  ttsVoice: string;
  holdToTalk: boolean;
  viewFontSize: FontSizeLevel;
  dictationCommands?: DictationCommand[];
  activationCommands?: Record<string, ActivationCommand[]>; // per-language activation commands
  voiceNotificationLight?: VoiceNotificationLight; // notification light settings
};

// Default dictation commands for English
export const defaultEnglishCommands: DictationCommand[] = [
  { name: 'new paragraph', voicePhrases: ['new paragraph', 'new line'], description: 'Insert a new paragraph' },
  { name: 'new sentence', voicePhrases: ['new sentence'], description: 'Start a new sentence' },
  { name: 'new bullet', voicePhrases: ['new bullet', 'bullet point'], description: 'Add a bullet point' },
  { name: 'tab', voicePhrases: ['tab'], description: 'Insert a tab' },
  { name: 'delete word', voicePhrases: ['delete word'], description: 'Delete the last word' },
];

// Default dictation commands for Finnish
export const defaultFinnishCommands: DictationCommand[] = [
  { name: 'new paragraph', voicePhrases: ['uusi kappale', 'uusi rivi'], description: 'Lisää uusi kappale' },
  { name: 'new sentence', voicePhrases: ['uusi lause'], description: 'Aloita uusi lause' },
  { name: 'new bullet', voicePhrases: ['uusi luettelokohta', 'luettelokohta'], description: 'Lisää luettelokohta' },
  { name: 'tab', voicePhrases: ['sarkain'], description: 'Lisää sarkain' },
  { name: 'delete word', voicePhrases: ['poista sana'], description: 'Poista viimeinen sana' },
];

// Default dictation commands for Swedish
export const defaultSwedishCommands: DictationCommand[] = [
  { name: 'new paragraph', voicePhrases: ['ny paragraf', 'ny rad'], description: 'Infoga en ny paragraf' },
  { name: 'new sentence', voicePhrases: ['ny mening'], description: 'Börja en ny mening' },
  { name: 'new bullet', voicePhrases: ['ny punkt', 'punkt'], description: 'Lägg till en punkt' },
  { name: 'tab', voicePhrases: ['tabb'], description: 'Infoga en tabb' },
  { name: 'delete word', voicePhrases: ['radera ord'], description: 'Radera sista ordet' },
];

// Default activation commands (language-specific)
export const defaultEnglishActivationCommands: ActivationCommand[] = [
  { type: 'command', phrases: ['Computer'], description: 'Activate dictation mode' },
  { type: 'ai', phrases: ['Assistant'], description: 'Activate AI mode' },
];

export const defaultFinnishActivationCommands: ActivationCommand[] = [
  { type: 'command', phrases: ['Tietokone'], description: 'Aktivoi sanelutila' },
  { type: 'ai', phrases: ['Avustaja'], description: 'Aktivoi AI-tila' },
];

export const defaultSwedishActivationCommands: ActivationCommand[] = [
  { type: 'command', phrases: ['Dator'], description: 'Aktivera dikteringsläge' },
  { type: 'ai', phrases: ['Assistent'], description: 'Aktivera AI-läge' },
];

export function getDefaultCommandsForLanguage(language: string): DictationCommand[] {
  switch (language) {
    case 'fi-FI':
      return defaultFinnishCommands;
    case 'sv-SE':
      return defaultSwedishCommands;
    case 'en-US':
    default:
      return defaultEnglishCommands;
  }
}

export function getDefaultActivationCommandsForLanguage(language: string): ActivationCommand[] {
  switch (language) {
    case 'fi-FI':
      return defaultFinnishActivationCommands;
    case 'sv-SE':
      return defaultSwedishActivationCommands;
    case 'en-US':
    default:
      return defaultEnglishActivationCommands;
  }
}

/**
 * Get the primary activation command phrase for a given language and type.
 * Extracts the first phrase from the activation commands for backward compatibility.
 */
export function getActivationCommandForLanguage(
  language: string,
  type: 'command' | 'ai',
  activationCommands?: Record<string, ActivationCommand[]>,
): string {
  const commands = activationCommands?.[language] ?? getDefaultActivationCommandsForLanguage(language);
  const cmd = commands.find((c) => c.type === type);
  return cmd?.phrases[0] ?? (type === 'command' ? 'Computer' : 'Assistant');
}

export const defaultNotificationLight: VoiceNotificationLight = {
  enabled: true,
  listening: '#0066ff', // Blue for listening
  commandRecognized: '#00cc00', // Green for command recognized
  aiRecognized: '#ffaa00', // Orange for AI recognized
  error: '#ff0000', // Red for error
  intensity: 'medium',
};

export const defaultSettings: UserSettings = {
  commandTrigger: 'Computer',
  aiTrigger: 'Assistant',
  language: 'en-US',
  dictationLanguage: 'en-US',
  ttsEnabled: true,
  ttsVoice: '',
  holdToTalk: false,
  viewFontSize: 'M',
  dictationCommands: defaultEnglishCommands,
  activationCommands: {
    'en-US': defaultEnglishActivationCommands,
    'fi-FI': defaultFinnishActivationCommands,
    'sv-SE': defaultSwedishActivationCommands,
  },
  voiceNotificationLight: defaultNotificationLight,
};

export const fontSizePx: Record<FontSizeLevel, number> = {
  S: 14,
  M: 16,
  L: 20,
  XL: 24,
  XXL: 28,
};
