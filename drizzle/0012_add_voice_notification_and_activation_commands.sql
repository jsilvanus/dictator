-- Migration: 0012_add_voice_notification_and_activation_commands
-- Description: Add voice notification light settings and language-specific activation commands to user settings

-- Update existing user settings to include voice notification light and activation commands
UPDATE users
SET settings = jsonb_build_object(
  'commandTrigger', COALESCE((settings->>'commandTrigger'), 'Computer'),
  'aiTrigger', COALESCE((settings->>'aiTrigger'), 'Assistant'),
  'language', COALESCE((settings->>'language'), 'en-US'),
  'dictationLanguage', COALESCE((settings->>'dictationLanguage'), 'en-US'),
  'ttsEnabled', COALESCE((settings->'ttsEnabled')::boolean, true),
  'ttsVoice', COALESCE((settings->>'ttsVoice'), ''),
  'holdToTalk', COALESCE((settings->'holdToTalk')::boolean, false),
  'viewFontSize', COALESCE((settings->>'viewFontSize'), 'M'),
  'dictationCommands', COALESCE(settings->'dictationCommands', '[]'::jsonb),
  'activationCommands', COALESCE(settings->'activationCommands', jsonb_build_object(
    'en-US', '[{"type":"command","phrases":["Computer"],"description":"Activate dictation mode"},{"type":"ai","phrases":["Assistant"],"description":"Activate AI mode"}]'::jsonb,
    'fi-FI', '[{"type":"command","phrases":["Tietokone"],"description":"Aktivoi sanelutila"},{"type":"ai","phrases":["Avustaja"],"description":"Aktivoi AI-tila"}]'::jsonb,
    'sv-SE', '[{"type":"command","phrases":["Dator"],"description":"Aktivera dikteringsläge"},{"type":"ai","phrases":["Assistent"],"description":"Aktivera AI-läge"}]'::jsonb
  )),
  'voiceNotificationLight', COALESCE(settings->'voiceNotificationLight', jsonb_build_object(
    'enabled', true,
    'listening', '#0066ff',
    'commandRecognized', '#00cc00',
    'aiRecognized', '#ffaa00',
    'error', '#ff0000',
    'intensity', 'medium'
  ))
)
WHERE settings IS NOT NULL;

-- For any new users or those with null settings, the defaults will be applied via application logic
