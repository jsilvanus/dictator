import { z } from 'zod';

export const dictationCommandSchema = z.object({
  name: z.string().min(1),
  voicePhrases: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
});

export const settingsSchema = z.object({
  commandTrigger: z.string().min(1),
  aiTrigger: z.string().min(1),
  language: z.enum(['en-US', 'fi-FI', 'sv-SE']),
  dictationLanguage: z.enum(['en-US', 'fi-FI', 'sv-SE']).optional(),
  ttsEnabled: z.boolean(),
  ttsVoice: z.string(),
  holdToTalk: z.boolean(),
  viewFontSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
  dictationCommands: z.array(dictationCommandSchema).optional(),
});
