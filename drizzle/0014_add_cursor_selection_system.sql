-- Cursor-Based Selection System Schema

-- Add cursor-related settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cursor_commands JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selection_commands JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_command_aliases JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cursor_default_size TEXT DEFAULT 'paragraph';

-- Create selection permissions table
CREATE TABLE IF NOT EXISTS selection_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  pii_type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'model', -- 'model', 'user', 'document'
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by TEXT NOT NULL DEFAULT 'ui', -- 'voice', 'ui'
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_selection_permissions_user_pii_scope
  ON selection_permissions(user_id, pii_type, scope)
  WHERE scope IN ('user', 'document');

CREATE INDEX IF NOT EXISTS idx_selection_permissions_user_doc
  ON selection_permissions(user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_selection_permissions_expires
  ON selection_permissions(expires_at)
  WHERE expires_at IS NOT NULL;

-- Add selection_mode to aiTurnProvenance to track what was selected
ALTER TABLE ai_turn_provenance ADD COLUMN IF NOT EXISTS selection_mode TEXT DEFAULT 'full'; -- 'full', 'selected', 'cursor'
ALTER TABLE ai_turn_provenance ADD COLUMN IF NOT EXISTS selected_char_range JSONB; -- {start, end}

-- Add index for provenance queries
CREATE INDEX IF NOT EXISTS idx_ai_turn_provenance_selection
  ON ai_turn_provenance(selection_mode);
