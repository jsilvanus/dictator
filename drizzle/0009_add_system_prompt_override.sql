-- Add missing column used by application schema
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS system_prompt_override text;
