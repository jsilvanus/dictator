export type FontSizeLevel = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type DictationCommand = {
  name: string;
  voicePhrases: string[]; // e.g., ["new paragraph", "new line"]
  description?: string;
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
};

export const fontSizePx: Record<FontSizeLevel, number> = {
  S: 14,
  M: 16,
  L: 20,
  XL: 24,
  XXL: 28,
};
