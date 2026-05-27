export type FontSizeLevel = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type UserSettings = {
  commandTrigger: string;
  aiTrigger: string;
  language: string;
  ttsEnabled: boolean;
  ttsVoice: string;
  holdToTalk: boolean;
  viewFontSize: FontSizeLevel;
};

export const defaultSettings: UserSettings = {
  commandTrigger: 'Computer',
  aiTrigger: 'Assistant',
  language: 'en-US',
  ttsEnabled: true,
  ttsVoice: '',
  holdToTalk: false,
  viewFontSize: 'M',
};

export const fontSizePx: Record<FontSizeLevel, number> = {
  S: 14,
  M: 16,
  L: 20,
  XL: 24,
  XXL: 28,
};
