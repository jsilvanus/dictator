-- Add system prompt field to user AI preferences
ALTER TABLE user_ai_preferences ADD COLUMN system_prompt TEXT;

-- Add system prompt override field to documents
ALTER TABLE documents ADD COLUMN system_prompt_override TEXT;
