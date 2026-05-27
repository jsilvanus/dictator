import { z } from 'zod';

export const settingsSchema = z.object({
  commandTrigger: z.string().min(1),
  aiTrigger: z.string().min(1),
  language: z.enum(['en-US', 'fi-FI', 'sv-SE']),
  ttsEnabled: z.boolean(),
  ttsVoice: z.string(),
  holdToTalk: z.boolean(),
  viewFontSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
});
